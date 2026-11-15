"use strict";

const ChaosRoadUI = ((model) => {
  const roleLabels = {
    customer: "ลูกค้า",
    staff: "พนักงานสาขา",
    admin: "ผู้ดูแลระบบ",
  };

  const statusLabels = {
    pending: "รอการอนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ถูกปฏิเสธ",
    cancelled: "ยกเลิก",
    renting: "กำลังเช่า",
    completed: "เสร็จสิ้น",
    available: "พร้อมใช้งาน",
    rented: "อยู่ระหว่างถูกเช่า",
    maintenance: "อยู่ระหว่างซ่อมบำรุง",
    inactive: "งดให้บริการ",
    unpaid: "รอชำระ",
    paid: "ชำระแล้ว",
    void: "ยกเลิกใบแจ้งหนี้",
  };

  const invoiceLabels = {
    deposit: "ค่ามัดจำ",
    balance: "ค่าเช่าส่วนที่เหลือ",
    extra: "ค่าบริการเพิ่มเติม",
  };

  const money = new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });

  const clock = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });

  const escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  const safe = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => escapeMap[ch]);

  const branchName = (code) => `${code} · ${model.branches[code]?.[0] || ""}`;
  const baht = (value) => money.format(value);
  const when = (value) => clock.format(value);
  const dateInput = (value) => when(value).replace(" ", "T");

  const branches = Object.keys(model.branches).map((code) => [
    code,
    branchName(code),
  ]);
  const types = model.types.map((type) => [type, type]);
  const searchTypes = [["all", "ทุกประเภทรถ (แสดงทั้งหมด)"], ...types];
  const statuses = Object.entries(statusLabels).filter(([key]) =>
    ["available", "rented", "maintenance", "inactive"].includes(key),
  );

  const badge = (value) =>
    `<span class="pill ${safe(value)}">${safe(statusLabels[value] || value)}</span>`;

  const options = (entries, value) =>
    entries
      .map(
        ([key, label]) =>
          `<option value="${safe(key)}"${key === value ? " selected" : ""}>${safe(label)}</option>`,
      )
      .join("");

  const hidden = (name, value) =>
    `<input type="hidden" name="${safe(name)}" value="${safe(value)}">`;

  const input = (name, label, value = "", type = "text", attrs = "required") =>
    `<label class="field">${safe(label)}<input name="${safe(name)}" type="${type}" value="${safe(value)}" ${attrs}></label>`;

  const select = (name, label, entries, selected) =>
    `<label class="field">${safe(label)}<select name="${safe(name)}" required>${options(entries, selected)}</select></label>`;

  const notes = (name, label, required = false, value = "") =>
    `<label class="field">${safe(label)}<textarea name="${safe(name)}" maxlength="300" ${required ? "required" : ""}>${safe(value)}</textarea></label>`;

  const checkbox = (name, label, required = false, checked = false) =>
    `<label class="check"><input name="${safe(name)}" type="checkbox" ${required ? "required" : ""} ${checked ? "checked" : ""}>${safe(label)}</label>`;

  const fileField = (name, label, imagesOnly = false, required = false) =>
    `<label class="field">${safe(label)}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp${imagesOnly ? "" : ",application/pdf"}" ${required ? "required" : ""}><small>PNG, JPEG, WebP${imagesOnly ? "" : " หรือ PDF"} · สูงสุด 10 MB</small><span class="attachment-preview" aria-live="polite"></span></label>`;

  const button = (label, attrs = "", variant = "") =>
    `<button type="button" class="btn ${variant}" ${attrs}>${safe(label)}</button>`;

  const go = (label, screen, id = "", variant = "secondary") =>
    button(label, `data-go="${screen}" data-id="${safe(id)}"`, variant);

  const submit = (label, value = "", variant = "") =>
    `<button class="btn ${variant}" type="submit" value="${safe(value)}">${safe(label)}</button>`;

  const title = (label, description = "", kicker = "") =>
    `<div class="page-title">${kicker ? `<p class="eyebrow">${safe(kicker)}</p>` : ""}<h1>${safe(label)}</h1>${description ? `<p class="muted">${safe(description)}</p>` : ""}</div>`;

  const section = (label, content) =>
    `<section class="panel stack"><h2>${safe(label)}</h2>${content}</section>`;

  const kpiStrip = (items) =>
    `<div class="kpi-grid">${items
      .map(
        ({ label, value, dark }) =>
          `<div class="kpi-card${dark ? " dark" : ""}"><span class="muted">${safe(label)}</span><strong class="kpi-value">${safe(value)}</strong></div>`,
      )
      .join("")}</div>`;

  const form = (name, content, cls = "stack") =>
    `<form class="${cls}" data-form="${name}">${content}</form>`;

  const fields = (content) => `<div class="field-grid">${content}</div>`;
  const actions = (content) => `<div class="actions">${content}</div>`;
  const toolbar = (content) => `<div class="toolbar">${content}</div>`;
  const empty = (message) => `<p class="callout">${safe(message)}</p>`;

  const details = (rows) =>
    `<dl>${rows
      .map(
        ([label, value]) =>
          `<div class="detail-item"><dt>${safe(label)}</dt><dd>${safe(value)}</dd></div>`,
      )
      .join("")}</dl>`;

  const table = (labels, rows) =>
    `<div class="table-scroll" tabindex="0"><table><thead><tr>${labels
      .map((label) => `<th scope="col">${safe(label)}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;

  function carSvg(type) {
    const isSuv = type.includes("SUV") || type === "กระบะ";
    const bodyPath = isSuv
      ? "M18 46 L26 24 Q30 18 40 18 L104 18 Q114 18 122 28 L136 32 Q142 34 142 42 L142 50 L18 50 Z"
      : "M16 46 L30 28 Q36 21 48 21 L98 21 Q110 21 120 31 L138 35 Q143 37 143 44 L143 50 L16 50 Z";
    return `<svg class="car-svg" viewBox="0 0 160 66" aria-hidden="true">
      <path d="${bodyPath}" fill="#292524" stroke="#0c0a09" stroke-width="1.5"/>
      <path d="M42 24 L98 24 L112 34 L34 34 Z" fill="#fafafa" opacity="0.92"/>
      <circle cx="42" cy="50" r="10" fill="#0c0a09" stroke="#d6d3d1" stroke-width="2.5"/>
      <circle cx="118" cy="50" r="10" fill="#0c0a09" stroke="#d6d3d1" stroke-width="2.5"/>
      <circle cx="42" cy="50" r="4" fill="#a8a29e"/>
      <circle cx="118" cy="50" r="4" fill="#a8a29e"/>
    </svg>`;
  }

  function fuelGaugeWidget(currentFuel) {
    const levels = [25, 50, 75, 100];
    return `<div class="fuel-widget"><div class="fuel-bar-track"><div class="fuel-bar-fill" style="width:${Number(currentFuel)}%"></div></div><div class="fuel-presets">${levels
      .map(
        (lvl) =>
          `<button type="button" class="chip" data-action="set-fuel" data-id="${lvl}">${lvl}%</button>`,
      )
      .join("")}</div></div>`;
  }

  function syntheticDocDataUrl(label, holderName = "พิมพ์ใจ ทดสอบ") {
    const isId = label.includes("ID");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="210" viewBox="0 0 380 210">
      <rect width="380" height="210" rx="12" fill="#fafaf9" stroke="#e7e5e4" stroke-width="2"/>
      <rect width="380" height="40" rx="12" fill="${isId ? "#18181b" : "#047857"}"/>
      <rect y="28" width="380" height="12" fill="${isId ? "#18181b" : "#047857"}"/>
      <text x="18" y="25" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="600">${safe(label)} · CHAOSROAD</text>
      <rect x="18" y="56" width="68" height="88" rx="6" fill="#e7e5e4"/>
      <circle cx="52" cy="84" r="14" fill="#a8a29e"/>
      <path d="M28 134 Q52 108 76 134" fill="#a8a29e"/>
      <text x="102" y="76" fill="#0c0a09" font-family="monospace" font-size="14" font-weight="600">${isId ? "1-1099-00451-89-2" : "DL-67004812"}</text>
      <text x="102" y="102" fill="#44403c" font-family="sans-serif" font-size="13">${safe(holderName)}</text>
      <text x="102" y="126" fill="#15803d" font-family="sans-serif" font-size="12" font-weight="600">VERIFIED SAMPLE · 2024–2029</text>
      <text x="18" y="182" fill="#78716c" font-family="sans-serif" font-size="11">เอกสารจำลองสำหรับการสาธิตระบบ ChaosRoad</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  return {
    roleLabels,
    statusLabels,
    invoiceLabels,
    safe,
    branchName,
    baht,
    when,
    dateInput,
    branches,
    types,
    searchTypes,
    statuses,
    badge,
    options,
    hidden,
    input,
    select,
    notes,
    checkbox,
    fileField,
    button,
    go,
    submit,
    title,
    section,
    kpiStrip,
    form,
    fields,
    actions,
    toolbar,
    empty,
    details,
    table,
    carSvg,
    fuelGaugeWidget,
    syntheticDocDataUrl,
  };
})(typeof ChaosRoad !== "undefined" ? ChaosRoad : require("./model.js"));

if (typeof module !== "undefined" && module.exports) {
  module.exports = ChaosRoadUI;
}
