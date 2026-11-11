"use strict";

(function startApp() {
  const model = ChaosRoad;
  const main = document.querySelector("#main");
  const notice = document.querySelector("#notice");
  const session = document.querySelector("#session");
  const roleLabels = { customer: "ลูกค้า", staff: "พนักงานสาขา", admin: "ผู้ดูแลระบบ" };
  const statusLabels = {
    pending: "รอการอนุมัติ", approved: "อนุมัติแล้ว", rejected: "ถูกปฏิเสธ", cancelled: "ยกเลิก",
    renting: "กำลังเช่า", completed: "เสร็จสิ้น", available: "พร้อมใช้งาน", rented: "อยู่ระหว่างถูกเช่า",
    maintenance: "อยู่ระหว่างซ่อมบำรุง", inactive: "งดให้บริการ", unpaid: "รอชำระ", paid: "ชำระแล้ว", void: "ยกเลิกใบแจ้งหนี้"
  };
  const invoiceLabels = { deposit: "ค่ามัดจำ", balance: "ค่าเช่าส่วนที่เหลือ", extra: "ค่าบริการเพิ่มเติม" };
  const navigation = {
    customer: [["search", "ค้นหารถ"], ["bookings", "การจองของฉัน"], ["history", "ประวัติการเช่า"]],
    staff: [["queue", "การจองสาขา"], ["fleet", "รถประจำสาขา"], ["outbox", "อีเมลยืนยัน"]],
    admin: [["fleet", "ยานพาหนะ"], ["pricing", "ราคาและโปรโมชัน"], ["maintenance", "บำรุงรักษา"],
      ["reports", "รายงาน"], ["accounts", "บัญชีพนักงาน"]]
  };
  const money = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
  const clock = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
  const safe = value => String(value ?? "").replace(/[&<>"']/g, character =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const branchName = code => `${code} · ${model.branches[code]?.[0] || ""}`;
  const baht = value => money.format(value);
  const when = value => clock.format(value);
  const dateInput = value => when(value).replace(" ", "T");
  const badge = value => `<span class="pill ${safe(value)}">${safe(statusLabels[value] || value)}</span>`;
  const options = (entries, value) => entries.map(([key, label]) =>
    `<option value="${safe(key)}"${key === value ? " selected" : ""}>${safe(label)}</option>`).join("");
  const branches = Object.keys(model.branches).map(code => [code, branchName(code)]);
  const types = model.types.map(type => [type, type]);
  const searchTypes = [["all", "ทุกประเภทรถ (แสดงทั้งหมด)"], ...types];
  const statuses = Object.entries(statusLabels).filter(([key]) => ["available", "rented", "maintenance", "inactive"].includes(key));
  const hidden = (name, value) => `<input type="hidden" name="${safe(name)}" value="${safe(value)}">`;
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
  const button = (label, attrs = "", variant = "") => `<button type="button" class="btn ${variant}" ${attrs}>${safe(label)}</button>`;
  const go = (label, screen, id = "", variant = "secondary") =>
    button(label, `data-go="${screen}" data-id="${safe(id)}"`, variant);
  const submit = (label, value = "", variant = "") =>
    `<button class="btn ${variant}" type="submit" value="${safe(value)}">${safe(label)}</button>`;
  const title = (label, description = "", kicker = "") =>
    `<div class="page-title">${kicker ? `<p class="eyebrow">${safe(kicker)}</p>` : ""}<h1>${safe(label)}</h1>${description ? `<p class="muted">${safe(description)}</p>` : ""}</div>`;
  const section = (label, content) => `<section class="panel stack"><h2>${safe(label)}</h2>${content}</section>`;
  const form = (name, content) => `<form class="stack" data-form="${name}">${content}</form>`;
  const fields = content => `<div class="field-grid">${content}</div>`;
  const actions = content => `<div class="actions">${content}</div>`;
  const empty = message => `<p class="callout">${safe(message)}</p>`;
  const details = rows => `<dl>${rows.map(([label, value]) => `<dt>${safe(label)}</dt><dd>${safe(value)}</dd>`).join("")}</dl>`;
  const table = (labels, rows) => `<div class="table-scroll" tabindex="0"><table><thead><tr>${labels.map(label =>
    `<th scope="col">${safe(label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

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

  function syntheticDocDataUrl(label, holderName = "พิมพ์ใจ ทดสอบ") {
    const isId = label.includes("ID");
    const titleTxt = isId ? "บัตรประจำตัวประชาชน · THAI NATIONAL ID" : "ใบอนุญาตขับรถยนต์ · DRIVING LICENCE";
    const docNo = isId ? "1-1037-00458-12-3" : "DL 58-001247 · ส่วนบุคคล";
    const expTxt = isId ? "วันบัตรหมดอายุ: 14 มี.ค. 2574" : "วันสิ้นอายุ: 14 มี.ค. 2572 (Valid)";
    const bg = isId ? "#eef5fc" : "#fdf3e7";
    const bar = isId ? "#1d5bb8" : "#c95a0c";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="220" viewBox="0 0 380 220">
      <rect width="380" height="220" rx="14" fill="${bg}" stroke="#c8c2ba" stroke-width="2"/>
      <rect width="380" height="42" rx="14" fill="${bar}"/>
      <rect y="24" width="380" height="18" fill="${bar}"/>
      <text x="18" y="27" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">${titleTxt}</text>
      <rect x="20" y="60" width="78" height="96" rx="8" fill="#d9d4ce" stroke="#a69f98"/>
      <circle cx="59" cy="94" r="18" fill="#8c857e"/>
      <path d="M35 144 Q59 118 83 144" fill="#8c857e"/>
      <text x="114" y="78" fill="#1a1a1a" font-family="monospace" font-size="14" font-weight="bold">${docNo}</text>
      <text x="114" y="106" fill="#1a1a1a" font-family="sans-serif" font-size="15" font-weight="bold">ชื่อตัว-ชื่อสกุล: ${holderName}</text>
      <text x="114" y="132" fill="#4a4540" font-family="sans-serif" font-size="12">เกิดวันที่: 14 มี.ค. 2541 · สัญชาติ: ไทย</text>
      <text x="114" y="156" fill="#1e7a3c" font-family="sans-serif" font-size="12" font-weight="bold">${expTxt}</text>
      <text x="20" y="194" fill="#6e675f" font-family="monospace" font-size="11">ChaosRoad Verified Synthetic Document · ${label}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  let state;
  let actor;
  let username = sessionStorage.getItem("chaosroad.user") || "";
  let view = username ? "workspace" : "home";
  let selected = "";
  let loginRole = "customer";
  let filter = "all";
  let staffFilter = { branch: "all", query: "" };
  let search;
  let report;
  let attachmentDb;

  function notify(message = "", error = false) {
    notice.textContent = message;
    notice.classList.toggle("error", error);
    if (message) window.scrollTo(0, 0);
  }

  function navigate(screen, id = "") {
    view = screen;
    selected = id;
    notify();
    render();
    main.querySelector("h1")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function setActor(user, keepCurrentBooking = false) {
    username = user.username;
    sessionStorage.setItem("chaosroad.user", username);
    filter = "all";
    if (keepCurrentBooking && view === "booking" && selected) {
      const bk = state.bookings.find(item => item.id === selected);
      const canSee = bk && (user.role === "customer" ? bk.owner === user.username :
        user.role === "staff" && (bk.pick === user.branch || (bk.drop === user.branch && ["renting", "completed"].includes(bk.status))));
      if (canSee) {
        navigate("booking", selected);
        return;
      }
    }
    navigate(navigation[user.role][0][0]);
  }

  function signOut() {
    sessionStorage.removeItem("chaosroad.user");
    username = "";
    actor = null;
    navigate("home");
  }

  function home() {
    const defaults = {
      pick: "BKK", drop: "CNX", type: "all",
      start: dateInput(model.now(state) + 2 * model.day).slice(0, 10) + "T10:00",
      end: dateInput(model.now(state) + 6 * model.day).slice(0, 10) + "T10:00"
    };
    const featuredCars = state.cars.filter(c => c.status === "available").slice(0, 6);
    const roles = [
      ["customer", "CUSTOMER PORTAL", "ค้นหารถ จองและติดตามสถานะ ชำระเงินผ่าน QR PromptPay และลงนามสัญญาเช่าอิเล็กทรอนิกส์"],
      ["staff", "BRANCH STAFF", "ตรวจเอกสาร อนุมัติ/ปฏิเสธคำขอ จัดทำสัญญา ตรวจสภาพส่งมอบและรับคืนรถตามสาขา"],
      ["admin", "SYSTEM ADMIN", "จัดการยานพาหนะ ตั้งราคา/โปรโมชัน แผนและผลบำรุงรักษา บัญชีพนักงาน และรายงานวิเคราะห์"]
    ];
    return `<div class="stack">
      <section class="hero-editorial">
        <div class="orb-field" aria-hidden="true">
          <div class="orb orb-mint"></div>
          <div class="orb orb-peach"></div>
          <div class="orb orb-lavender"></div>
          <div class="orb orb-sky"></div>
        </div>
        <div class="hero-content">
          <div class="hero-headline-group">
            <p class="eyebrow">CHAOSROAD MOBILITY · THAILAND</p>
            <h1>ระบบบริหารจัดการรถเช่า</h1>
            <p class="hero-sub">บริการเช่ารถยนต์มาตรฐานสากล รับ-คืนข้ามสาขาได้ทั่วไทย ครบทุกขั้นตอนตั้งแต่วางแผนการเดินทาง คำนวณโปรโมชันอัตโนมัติ ชำระเงินผ่าน QR PromptPay และลงนามสัญญาเช่าอิเล็กทรอนิกส์</p>
            <div class="hero-badges">
              <span class="hero-badge">7 สาขาสนามบินและตัวเมือง</span>
              <span class="hero-badge">คืนรถต่างสาขาได้ทั่วประเทศ</span>
              <span class="hero-badge">ส่วนลดอัตโนมัติสูงสุด 15%</span>
              <span class="hero-badge">สัญญาเช่า E-Signature</span>
            </div>
          </div>
          <form class="booking-search-bar" data-form="hero-search">
            <div class="row">
              <strong>ค้นหารถเช่าและเช็กราคาทันที</strong>
              <small class="muted">คำนวณโปรโมชันและค่าธรรมเนียมคืนรถต่างสาขาอัตโนมัติ</small>
            </div>
            <div class="field-grid">
              ${select("pick", "สาขารับรถ", branches, defaults.pick)}
              ${select("drop", "สาขาคืนรถ", branches, defaults.drop)}
              ${input("start", "วันเวลารับรถ", defaults.start, "datetime-local")}
              ${input("end", "วันเวลาคืนรถ", defaults.end, "datetime-local")}
              ${select("type", "ประเภทรถ", searchTypes, defaults.type)}
            </div>
            <div class="row">
              <small class="muted">ฟรีค่าธรรมเนียมเมื่อคืนรถสาขาเดิม · ผ่อนผันเวลาคืนรถ 30 นาที</small>
              ${submit("ค้นหารถเช่าทันที")}
            </div>
          </form>
        </div>
      </section>

      <section class="stack">
        <div class="section-header">
          <div>
            <h2>รุ่นรถยนต์ยอดนิยมพร้อมให้บริการ</h2>
            <p class="muted">รถยนต์ทุกคันผ่านการตรวจเช็กระยะมาตรฐาน พร้อมประกันภัยและบริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง</p>
          </div>
          ${button("ดูรถว่างทั้งหมด", 'data-action="quick-user" data-id="customer"', "secondary")}
        </div>
        <div class="grid">
          ${featuredCars.map(car => `<article class="card">
            <div class="car-visual">
              <div class="car-visual-top"><span class="car-tag">${safe(car.type)}</span><span class="code">${safe(car.plate)}</span></div>
              ${carSvg(car.type)}
            </div>
            <div>
              <h3>${safe(car.brand + " " + car.model)}</h3>
              <p class="muted">${safe(car.notes || "พร้อมให้บริการทันที")} · ประจำสาขา ${safe(branchName(car.branch))}</p>
            </div>
            <div class="spec-chips">
              <span class="spec-chip">${safe(car.fuel)}</span>
              <span class="spec-chip">${car.seats} ที่นั่ง</span>
              <span class="spec-chip">สี${safe(car.color)}</span>
              <span class="spec-chip">ปี ${car.year}</span>
            </div>
            <div class="row">
              <div><small class="muted">เริ่มต้นต่อวัน</small><br><strong class="metric">${baht(car.pricing.daily)}</strong> <small class="muted">(7 วัน+ ${baht(car.pricing.weekly)}/วัน)</small></div>
              ${button("เลือกคันนี้", `data-action="hero-book" data-id="${safe(car.id)}"`)}
            </div>
          </article>`).join("")}
        </div>
      </section>

      <section class="grid">
        <div class="gradient-orb-card">
          <span class="code">01 · BOOK &amp; VERIFY</span>
          <h3>จองออนไลน์และอัปโหลดเอกสาร</h3>
          <p class="muted">เลือกรุ่นรถและสาขารับ-คืน แนบสำเนาบัตรประชาชนและใบขับขี่เพื่อให้เจ้าหน้าที่สาขาตรวจสอบและอนุมัติอย่างรวดเร็ว</p>
        </div>
        <div class="gradient-orb-card">
          <span class="code">02 · PROMPTPAY &amp; E-CONTRACT</span>
          <h3>ชำระมัดจำ QR และเซ็นสัญญา</h3>
          <p class="muted">เมื่อได้รับอนุมัติ ระบบออกใบแจ้งหนี้ค่ามัดจำพร้อม QR PromptPay ให้ชำระภายใน 24 ชม. และลงนามสัญญาเช่าอิเล็กทรอนิกส์ได้ทันที</p>
        </div>
        <div class="gradient-orb-card">
          <span class="code">03 · PICKUP &amp; ONE-WAY RETURN</span>
          <h3>รับรถและคืนรถข้ามสาขา</h3>
          <p class="muted">บันทึกเลขไมล์และระดับน้ำมันโปร่งใสทั้งตอนส่งมอบและรับคืน คืนรถต่างสาขาได้ทั้ง 7 จุดบริการทั่วไทย</p>
        </div>
      </section>

      <section class="stack">
        <div>
          <h2>เครือข่าย 7 สาขาสนามบินและตัวเมือง</h2>
          <p class="muted">รองรับการรับรถและคืนรถข้ามสาขาทั้งในภูมิภาคเดียวกันและข้ามภูมิภาค</p>
        </div>
        <div class="branch-grid">
          ${Object.entries(model.branches).map(([code, [name, region, address]]) => {
            const count = state.cars.filter(c => c.branch === code && c.status === "available").length;
            return `<div class="branch-card">
              <div class="row"><strong class="code">${safe(code)} · ${safe(name)}</strong><span class="pill available">ว่าง ${count} คัน</span></div>
              <small class="muted">${safe(address)} (${safe(region)})</small>
            </div>`;
          }).join("")}
        </div>
      </section>

      <section class="stack">
        <div class="section-header">
          <div>
            <h2>เข้าใช้งานระบบตามบทบาท (Role Portals)</h2>
            <p class="muted">สำหรับลูกค้า พนักงานประจำสาขา และผู้ดูแลระบบส่วนกลาง · ข้อมูลเชื่อมโยงกันแบบเรียลไทม์</p>
          </div>
          <div class="actions">
            ${button("โหลดข้อมูลตัวอย่างครบวงจร", 'data-action="load-rich"', "secondary")}
            ${button("รีเซ็ตข้อมูลทดลอง", 'data-action="reset"', "secondary")}
          </div>
        </div>
        <div class="grid roles" aria-label="เลือกพอร์ทัล">
          ${roles.map(([role, code, description]) => `<article class="card">
            <p class="eyebrow">${code}</p><h2>${roleLabels[role]}</h2><p class="muted">${description}</p>${go("เข้าสู่พอร์ทัล", "login", role, "")}</article>`).join("")}
        </div>
      </section>
    </div>`;
  }

  function login() {
    const users = { customer: ["customer", "somchai.j"], staff: ["staff.bkk", "staff.cnx"], admin: ["admin"] };
    const availableUsers = users[loginRole].filter(u => state.users.some(item => item.username === u));
    return `<div class="narrow">${title("เข้าสู่ระบบ " + roleLabels[loginRole], "ใช้บัญชีตัวอย่างเพื่อเดิน flow ของแต่ละบทบาท หรือคลิกปุ่มลัดด้านล่าง", "DEMO SIGN-IN")}
      ${section("Username และรหัสผ่าน", form("login", fields(input("username", "Username", "", "text", 'required autocomplete="username"') +
        input("password", "รหัสผ่านทดลอง", "", "password", 'required autocomplete="current-password"')) + actions(submit("เข้าสู่ระบบ") +
        (loginRole === "customer" ? go("สมัครสมาชิก", "register") : "") + go("กลับหน้าหลัก", "home"))) +
        `<div class="callout"><p>คลิกชื่อบัญชีเพื่อกรอกอัตโนมัติ · รหัสผ่าน <strong>${safe(model.demoPassword)}</strong></p>${actions((availableUsers.length ? availableUsers : users[loginRole].slice(0, 2)).map(user =>
          button(user, `data-action="fill-login" data-id="${user}"`, "secondary")).join(""))}</div>`)}
      </div>`;
  }

  function accountFields(user) {
    return fields(input("name", "ชื่อ-นามสกุล", user?.name) + input("email", "อีเมล", user?.email, "email") +
      input("phone", "เบอร์โทรศัพท์", user?.phone, "tel") + input("username", "Username", user?.username) +
      input("password", user ? "รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)" : "รหัสผ่านทดลอง", "", "password",
        (user ? "" : "required ") + 'minlength="8" autocomplete="new-password"'));
  }

  function registration() {
    return `<div class="narrow">${title("สมัครบัญชีลูกค้า", "สร้างบัญชีใหม่เพื่อค้นหารถ จอง ชำระเงิน และเซ็นสัญญาออนไลน์ (DFD 1.1)", "CUSTOMER ACCOUNT")}
      ${section("ข้อมูลบัญชีลูกค้า", form("register", accountFields() +
        input("confirm", "ยืนยันรหัสผ่านทดลอง", "", "password", 'required minlength="8" autocomplete="new-password"') +
        actions(submit("สร้างบัญชี") + go("กลับหน้าเข้าสู่ระบบ", "login", "customer"))))}</div>`;
  }

  function quoteDetails(quote) {
    const remaining = Math.max(0, quote.total - quote.deposit);
    return details([
      ["ระยะเวลาเช่า", `${quote.days} วัน`],
      ["อัตราที่ใช้ต่อวัน", baht(quote.rate)],
      ["ค่าเช่าก่อนส่วนลด", baht(quote.base)],
      ["โปรโมชันอัตโนมัติ", quote.discount ? `${quote.promotion} · −${baht(quote.discount)}` : "ไม่มีส่วนลดที่เข้าเงื่อนไข"],
      ["ค่าธรรมเนียมคืนต่างสาขา", quote.oneWay ? `${baht(quote.oneWay)} (One-way)` : `${baht(0)} (สาขาเดียวกัน)`],
      ["ค่าเช่ารวมโดยประมาณ", baht(quote.total)],
      ["ค่ามัดจำ (ชำระหลังอนุมัติ)", baht(quote.deposit)],
      ["ค่าเช่าส่วนที่เหลือ (ชำระตอนรับรถ)", baht(remaining)]
    ]);
  }

  function searchScreen() {
    const defaults = {
      pick: "BKK", drop: "CNX", type: "Sedan",
      start: dateInput(model.now(state) + 2 * model.day).slice(0, 10) + "T10:00",
      end: dateInput(model.now(state) + 6 * model.day).slice(0, 10) + "T10:00"
    };
    const draft = search || defaults;
    const trip = search && model.parseTrip(search);
    const cars = trip ? state.cars.filter(car => model.available(state, car, trip)) : [];
    const typePills = [["all", "ทุกประเภทรถ"], ...types].map(([val, label]) =>
      `<button type="button" class="chip ${draft.type === val ? "active" : ""}" data-action="pick-type" data-id="${safe(val)}">${safe(label)}</button>`
    ).join("");
    return `${title("ค้นหารถ", "เลือกสาขารับ-คืนรถ วันเวลา และประเภทรถ ระบบคำนวณโปรโมชันและค่าธรรมเนียมต่างสาขาให้อัตโนมัติ (DFD 2.1–2.2)", "02 / BOOKING")}
      <div class="stack">${section("รายละเอียดการเดินทาง", form("search", fields(
        select("pick", "สาขารับรถ", branches, draft.pick) + select("drop", "สาขาคืนรถ", branches, draft.drop) +
        input("start", "วันเวลารับรถ", draft.start, "datetime-local") + input("end", "วันเวลาคืนรถ", draft.end, "datetime-local") +
        select("type", "ประเภทรถ", searchTypes, draft.type)) +
        `<div class="chip-bar"><small class="muted">เลือกประเภทรถด่วน:</small>${typePills}</div>` +
        actions(submit("ค้นหารถที่ว่าง"))))}
      ${trip ? `<section class="stack"><h2>รถที่ว่าง (${cars.length})</h2>${cars.length ? `<div class="grid">${cars.map(car => {
        const quote = model.quote(car, trip);
        return `<article class="card">
          <div class="car-visual">
            <div class="car-visual-top"><span class="car-tag">${safe(car.type)}</span><span class="code">${safe(car.plate)}</span></div>
            ${carSvg(car.type)}
          </div>
          <p class="eyebrow">${safe(car.type)} / ${safe(car.plate)}</p>
          <h3>${safe(car.brand + " " + car.model)}</h3>
          <div class="spec-chips">
            <span class="spec-chip">สี${safe(car.color)}</span>
            <span class="spec-chip">${safe(car.fuel)}</span>
            <span class="spec-chip">${car.seats} ที่นั่ง</span>
            <span class="spec-chip">ปี ${car.year}</span>
            <span class="spec-chip">${branchName(car.branch)}</span>
          </div>
          <p class="muted">${safe(car.notes || "พร้อมให้บริการทันที")} · ${baht(car.pricing.daily)}/วัน (7 วัน+ ${baht(car.pricing.weekly)}/วัน)</p>
          <div class="row"><div><small class="muted">ค่าเช่ารวมสุทธิ (${quote.days} วัน)</small><br><strong class="metric">${baht(quote.total)}</strong></div>
            <small class="muted">มัดจำ ${baht(quote.deposit)}</small></div>
          ${go("ดูราคาและจอง", "request", car.id, "")}</article>`;
      }).join("")}</div>` : empty("ไม่พบรถว่างสำหรับเงื่อนไขนี้ ลองเลือก 'ทุกประเภทรถ' หรือเปลี่ยนสาขา/วันเวลา")}</section>` : ""}</div>`;
  }

  function requestScreen() {
    if (!search) return searchScreen();
    const car = model.getVehicle(state, selected);
    const trip = model.parseTrip(search);
    return `${title("ส่งคำขอจอง", car.brand + " " + car.model + " · " + car.plate, "ONLINE RESERVATION")}
      <div class="checkout-layout">
        <div class="stack">
          ${section("เอกสารยืนยันตัวตนผู้เช่า (DFD 2.3.1)", form("request", fields(fileField("identity", "สำเนาบัตรประชาชน", false, true) +
            fileField("licence", "สำเนาใบขับขี่", false, true)) +
            actions(button("ใส่ไฟล์ตัวอย่าง", 'data-action="sample-files"', "secondary")) +
            `<p class="muted">คลิก "ใส่ไฟล์ตัวอย่าง" เพื่อสร้างภาพบัตรประชาชนและใบขับขี่จำลองอัตโนมัติ หรือเลือกไฟล์จริงจากเครื่อง · ใบแจ้งหนี้ค่ามัดจำจะออกหลังสาขาตรวจสอบและอนุมัติคำขอ</p>` +
            actions(submit("ส่งคำขอจอง"), go("กลับไปค้นหา", "search"))))}
        </div>
        <div class="sticky-summary stack">
          ${section("ข้อมูลรถยนต์และสรุปราคา (DFD 2.2.4)", `<div class="car-visual">
              <div class="car-visual-top"><span class="car-tag">${safe(car.type)}</span><span class="code">${safe(car.plate)}</span></div>
              ${carSvg(car.type)}
            </div>` +
            quoteDetails(model.quote(car, trip)) +
            details([
              ["รถยนต์ที่เลือก", `${car.brand} ${car.model} (${car.type}) · ทะเบียน ${car.plate}`],
              ["รายละเอียดรถ", `สี${car.color} · ปี ${car.year} · ${car.fuel} · ${car.seats} ที่นั่ง · สาขาที่สังกัด ${branchName(car.branch)}`],
              ["รับรถ", `${branchName(trip.pick)} · ${when(trip.start)}`],
              ["คืนรถ", `${branchName(trip.drop)} · ${when(trip.end)}`]
            ]))}
        </div>
      </div>`;
  }

  function bookingRows(bookings, history = false) {
    if (!bookings.length) return empty(history ? "ยังไม่มีการเช่าที่เสร็จสิ้น" : "ยังไม่มีการจองในรายการนี้");
    return table(["Booking ID / รถ", "รับ → คืน", "ยอดรวม / มัดจำ", "สถานะ", "เปิด"], bookings.map(booking => [
      `<strong class="code">${safe(booking.id)}</strong><br>${safe(booking.vehicle)} · <small>${safe(booking.plate)}</small>`,
      `${safe(booking.pick)} → ${safe(booking.drop)}<br><small>${when(booking.start)} → ${when(booking.end)}</small>`,
      `<strong>${baht(booking.quote.total)}</strong><br><small>มัดจำ ${baht(booking.quote.deposit)}</small>`,
      badge(booking.status), go("ดู " + booking.id, "booking", booking.id)
    ]));
  }

  function customerBookings(history) {
    const allOwned = state.bookings.filter(item => item.owner === username);
    const bookings = allOwned.filter(item => !history || item.status === "completed").reverse();
    const completedCount = allOwned.filter(item => item.status === "completed").length;
    const activeCount = allOwned.filter(item => ["pending", "approved", "renting"].includes(item.status)).length;
    const kpiHtml = `<div class="kpi-grid">
      <div class="kpi-card"><span class="muted">รายการจองทั้งหมด</span><strong class="kpi-value">${allOwned.length}</strong></div>
      <div class="kpi-card"><span class="muted">กำลังดำเนินการ</span><strong class="kpi-value">${activeCount}</strong></div>
      <div class="kpi-card"><span class="muted">เช่าเสร็จสิ้นแล้ว</span><strong class="kpi-value">${completedCount}</strong></div>
    </div>`;
    return title(history ? "ประวัติการเช่า" : "การจองของฉัน", "เลือก Booking ID เพื่อดูสถานะ ชำระใบแจ้งหนี้ เซ็นสัญญา หรือแก้ไข/ยกเลิกการจอง (DFD 2.6–2.7)", "CUSTOMER") +
      `<div class="stack">${kpiHtml}${section("รายการจอง", bookingRows(bookings, history))}</div>`;
  }

  function queue() {
    const pickup = state.bookings.filter(item => item.pick === actor.branch).reverse();
    const returns = state.bookings.filter(item => item.drop === actor.branch && ["renting", "completed"].includes(item.status)).reverse();
    const pendingCount = pickup.filter(item => item.status === "pending").length;
    const approvedCount = pickup.filter(item => item.status === "approved").length;
    const rentingReturnCount = returns.filter(item => item.status === "renting").length;
    const branchCars = state.cars.filter(car => car.branch === actor.branch && car.status === "available").length;
    const kpiHtml = `<div class="kpi-grid">
      <div class="kpi-card"><span class="muted">คำขอรออนุมัติ (รับที่สาขา)</span><strong class="kpi-value">${pendingCount}</strong></div>
      <div class="kpi-card"><span class="muted">อนุมัติแล้ว / รอส่งมอบ</span><strong class="kpi-value">${approvedCount}</strong></div>
      <div class="kpi-card"><span class="muted">กำลังเช่า (รอรับคืนที่สาขา)</span><strong class="kpi-value">${rentingReturnCount}</strong></div>
      <div class="kpi-card dark"><span class="muted">รถพร้อมใช้งานในสาขา</span><strong class="kpi-value">${branchCars} คัน</strong></div>
    </div>`;
    return title("การจองสาขา", branchName(actor.branch) + " · ตรวจสอบเอกสาร จัดทำสัญญา ส่งมอบและรับคืนรถ", "RENTAL STAFF") +
      `<div class="stack">${kpiHtml}${section("รับรถที่สาขานี้", bookingRows(pickup))}${section("คืนรถที่สาขานี้", bookingRows(returns))}</div>`;
  }

  function bookingForView() {
    const booking = state.bookings.find(item => item.id === selected);
    if (!booking || !(actor.role === "customer" ? booking.owner === username :
      actor.role === "staff" && (booking.pick === actor.branch ||
        (booking.drop === actor.branch && ["renting", "completed"].includes(booking.status))))) {
      throw new Error("การจองนี้อยู่นอกสิทธิ์ของบัญชี");
    }
    return booking;
  }

  function routeDetails(booking) {
    const depInv = state.invoices.find(item => item.bookingId === booking.id && item.kind === "deposit");
    const payState = depInv ? statusLabels[depInv.status] : "ยังไม่ออกใบแจ้งหนี้";
    return details([
      ["ทะเบียนรถ", `${booking.plate} · ${booking.vehicle} (${booking.type})`],
      ["รับรถ", `${branchName(booking.pick)} · ${when(booking.start)}`],
      ["คืนรถ", `${branchName(booking.drop)} · ${when(booking.end)}`],
      ["ค่าเช่ารวม", baht(booking.quote.total)],
      ["ค่าคืนต่างสาขา (รวมแล้ว)", baht(booking.quote.oneWay)],
      ["ส่วนลดโปรโมชัน", booking.quote.discount ? `−${baht(booking.quote.discount)} (${booking.quote.promotion})` : baht(0)],
      ["ค่ามัดจำ", `${baht(booking.quote.deposit)} (${payState})`]
    ]);
  }

  function customerActions(booking) {
    const active = ["pending", "approved"].includes(booking.status);
    return actions(
      (active ? go("เปลี่ยนรายละเอียดการคืน", "change", booking.id) : "") +
      (active ? go("ยกเลิกการจอง", "cancel", booking.id, "danger") : "")
    );
  }

  function attachmentLink(label, attachment) {
    if (!attachment) return "";
    return button(`${label} · ${attachment.name} (${Math.ceil(attachment.size / 1024)} KB)`,
      `data-action="download" data-id="${safe(attachment.key)}" data-filename="${safe(attachment.name)}"`, "secondary");
  }

  function inlineDocPreview(booking) {
    const customer = state.users.find(item => item.username === booking.owner);
    const holder = customer?.name || booking.owner;
    return `<div class="compare-grid">
      <div class="compare-box stack">
        <strong>สำเนาบัตรประจำตัวประชาชน</strong>
        <img class="doc-preview-img" data-doc-key="${safe(booking.identity?.key || "")}" src="${syntheticDocDataUrl("ID CARD", holder)}" alt="ตัวอย่างสำเนาบัตรประชาชน">
        ${attachmentLink("บัตรประชาชน", booking.identity)}
      </div>
      <div class="compare-box stack">
        <strong>สำเนาใบอนุญาตขับขี่</strong>
        <img class="doc-preview-img" data-doc-key="${safe(booking.licence?.key || "")}" src="${syntheticDocDataUrl("DRIVING LICENCE", holder)}" alt="ตัวอย่างสำเนาใบขับขี่">
        ${attachmentLink("ใบขับขี่", booking.licence)}
      </div>
    </div>`;
  }

  function reviewForm(booking) {
    const customer = state.users.find(item => item.username === booking.owner);
    const rentals = state.bookings.filter(item => item.owner === customer.username && item.status === "completed").length;
    const rejectReasons = ["ใบขับขี่หมดอายุ", "ภาพเอกสารไม่ชัดเจน", "ชื่อไม่ตรงกับผู้จอง", "เอกสารไม่ครบถ้วน"];
    return section("ตรวจสอบคำขอและเอกสารยืนยันตัวตน (DFD 2.4)", details([
      ["ลูกค้า", customer.name], ["Username", customer.username], ["อีเมล", customer.email],
      ["โทรศัพท์", customer.phone], ["เช่าเสร็จสิ้นแล้ว", `${rentals} ครั้ง`]
    ]) +
      inlineDocPreview(booking) +
      form("review", hidden("id", booking.id) +
        checkbox("verified", "ตรวจเอกสารทั้งสองรายการแล้ว (ชื่อตรงกับผู้จอง และใบขับขี่ครอบคลุมวันเช่า)") +
        `<div class="chip-bar"><small class="muted">ระบุเหตุผลปฏิเสธด่วน:</small>${rejectReasons.map(r =>
          `<button type="button" class="chip" data-action="fill-reason" data-target="reason" data-id="${safe(r)}">${safe(r)}</button>`
        ).join("")}</div>` +
        notes("reason", "เหตุผลหากปฏิเสธ") +
        actions(submit("อนุมัติคำขอ", "approve") + submit("ปฏิเสธคำขอ", "reject", "danger"))));
  }

  function contractPanel(booking) {
    const contract = booking.contract;
    if (!contract) return "";
    const renter = state.users.find(item => item.username === booking.owner);
    const canSign = booking.status === "approved" && !contract[actor.role] &&
      (actor.role === "customer" || actor.branch === booking.pick);
    const sigBox = (roleTitle, record) => `<div class="sig-slot">
      <small class="muted">${safe(roleTitle)}</small>
      ${record?.drawn ? `<img src="${safe(record.drawn)}" alt="ลายเซ็นอิเล็กทรอนิกส์">` : ""}
      <div><strong>${record ? safe(record.name) : "ยังไม่ได้ลงนามสัญญา"}</strong></div>
      <small class="muted">${record ? when(record.at) : "ยังไม่ได้ลงนาม"}</small>
    </div>`;
    return section("สัญญาเช่ารถ " + contract.id, `<div class="contract-paper">
      <div class="row"><div><strong>หนังสือสัญญาเช่ารถยนต์อิเล็กทรอนิกส์</strong><br><small class="muted">บริษัท เคออสโรด (ประเทศไทย) จำกัด</small></div>
        <span class="code">${safe(contract.id)} · ${safe(booking.id)}</span></div>
      ${routeDetails(booking)}
      ${details([
        ["ชื่อผู้เช่า", renter.name], ["ชื่อผู้ให้เช่า", contract.lessor],
        ["ประเภทรถ", contract.type ?? booking.type], ["ปีและสี", [contract.year, contract.color].filter(Boolean).join(" · ") || "—"],
        ["ลายเซ็นลูกค้า", contract.customer ? `${contract.customer.name} · ${when(contract.customer.at)}` : "รอลงนาม"],
        ["ลายเซ็นพนักงาน", contract.staff ? `${contract.staff.name} · ${when(contract.staff.at)}` : "รอลงนาม"],
        ["ค่าคืนช้า", `ผ่อนผัน 30 นาที · ${baht(booking.quote.lateRate)}/ชม. · สูงสุดอัตราเช่า 1 วัน (${baht(booking.quote.rate)})`]
      ])}
      <div class="contract-terms">
        <strong>ข้อกำหนดและเงื่อนไขสัญญาเช่า:</strong> 1) ผู้เช่าต้องคืนรถตามวันเวลาและสาขาที่ระบุ หากล่าช้าเกิน 30 นาที คิดค่าปรับชั่วโมงละ ${baht(booking.quote.lateRate)} สูงสุดไม่เกินค่าเช่า 1 วัน · 2) คืนรถพร้อมระดับน้ำมันเท่ากับตอนรับรถ · 3) ผู้เช่ารับผิดชอบความเสียหายใหม่ที่ตรวจพบตอนคืนรถตามจริง · 4) ห้ามนำรถออกนอกราชอาณาจักร
      </div>
      <div class="sig-boxes">
        ${sigBox("ผู้ให้เช่า (พนักงานสาขา)", contract.staff)}
        ${sigBox("ผู้เช่า (ลูกค้า)", contract.customer)}
      </div>
      ${actions(attachmentLink("สำเนาบัตรประชาชน", booking.identity) + attachmentLink("สำเนาใบขับขี่", booking.licence))}
    </div>` +
    (canSign ? form("sign", hidden("id", booking.id) + hidden("drawnSig", "") +
      `<div class="sig-pad-wrap">
        <div class="row"><strong>วาดลายเซ็นอิเล็กทรอนิกส์ หรือพิมพ์ชื่อด้านล่าง (DFD 3.2)</strong>
          ${button("ล้างลายเซ็นที่วาด", 'data-action="clear-sig"', "secondary")}</div>
        <canvas class="sig-canvas" width="560" height="130" data-default-signer="${safe(actor.name)}"></canvas>
        <small class="muted">สามารถใช้เมาส์หรือนิ้ววาดลายเซ็นในกรอบประสีส้ม (ระบบจะเติมชื่อลงนามให้อัตโนมัติ) หรือพิมพ์ชื่อในช่องด้านล่าง</small>
      </div>` +
      input("signature", "พิมพ์ชื่อเพื่อเซ็นสัญญา", actor.name) +
      checkbox("consent", "ยืนยันการลงนามอิเล็กทรอนิกส์สำหรับสัญญาฉบับนี้", true) +
      actions(submit("ลงนามสัญญา"))) : ""));
  }

  function fuelGaugeWidget(currentFuel) {
    const eighths = Math.round((Number(currentFuel) || 0) / 12.5);
    return `<div class="stack"><small class="muted">ตัวช่วยเลือกระดับน้ำมัน (1/8 – 8/8 ถัง):</small>
      <div class="fuel-gauge">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
        const pct = Math.round(n * 12.5);
        return `<button type="button" class="fuel-step ${n <= eighths ? "filled" : ""}" data-action="set-fuel" data-id="${pct}">${n}/8 (${pct}%)</button>`;
      }).join("")}</div></div>`;
  }

  function inspectionFields(booking, returning) {
    const car = model.getVehicle(state, booking.carId);
    const initialFuel = returning ? booking.pickup.fuel : 100;
    const noteChips = returning
      ? ["สภาพปกติ ไม่มีริ้วรอยใหม่", "มีรอยขีดข่วนกันชนหลัง", "ระดับน้ำมันต่ำกว่าตอนส่งมอบ", "ต้องเข้าศูนย์ตรวจเช็กระยะ"]
      : ["ตัวถังปกติ อุปกรณ์ยางอะไหล่ครบ", "มีรอยขนแมวเล็กน้อยที่ประตูขวา", "ล้อแม็กหน้าซ้ายมีรอยเดิม", "ห้องโดยสารสะอาด พร้อมส่งมอบ"];
    return fields(
      input("recordedAt", returning ? "วันเวลารับคืนจริง" : "วันเวลาส่งมอบจริง", dateInput(returning ? booking.end : booking.start), "datetime-local") +
      input("odometer", returning ? "เลขไมล์สิ้นสุด" : "เลขไมล์เริ่มต้น", returning ? booking.pickup.odometer : car.odometer, "number", 'required min="0" step="1"') +
      input("fuel", returning ? "ระดับน้ำมันสิ้นสุด (%)" : "ระดับน้ำมันเริ่มต้น (%)", initialFuel, "number", 'required min="0" max="100" step="1"') +
      fileField("photo", returning ? "ภาพความเสียหายใหม่ (ถ้ามี)" : "ภาพริ้วรอยเดิม (ถ้ามี)", true)
    ) +
    fuelGaugeWidget(initialFuel) +
    `<div class="chip-bar"><small class="muted">ข้อความหมายเหตุด่วน:</small>${noteChips.map(c =>
      `<button type="button" class="chip" data-action="fill-reason" data-target="notes" data-id="${safe(c)}">${safe(c)}</button>`
    ).join("")}</div>` +
    notes("notes", "หมายเหตุการตรวจสภาพ");
  }

  function inspectionSummary(label, inspection) {
    return `<div class="compare-box stack"><h3>${safe(label)}</h3>${details([
      ["วันเวลาจริง", when(inspection.recordedAt)], ["เลขไมล์", `${inspection.odometer.toLocaleString()} กม.`],
      ["น้ำมัน", `${inspection.fuel}% (${Math.round(inspection.fuel / 12.5)}/8 ถัง)`], ["หมายเหตุ", inspection.notes || "—"]
    ])}${attachmentLink("ภาพตรวจสภาพ", inspection.photo)}</div>`;
  }

  function chargeDetails(charges) {
    return details([["ค่าคืนช้า", `${charges.lateHours} ชม. · ${baht(charges.late)}`],
      ["ค่าน้ำมันขาด", baht(charges.fuel)], ["ค่าความเสียหาย", baht(charges.damage)], ["รวมค่าบริการเพิ่มเติม", baht(charges.total)]]);
  }

  function handoverPanel(booking) {
    if (actor.role !== "staff" || booking.pick !== actor.branch || booking.status !== "approved" ||
      !booking.contract?.customer || !booking.contract?.staff) return "";
    return section("ตรวจสภาพและส่งมอบรถ (DFD 3.3 & 4.2)", form("handover", hidden("id", booking.id) + inspectionFields(booking, false) +
      actions(submit("ยืนยันส่งมอบและออกใบแจ้งหนี้ค่าเช่า", "issue") + submit("บันทึกส่งมอบอย่างเดียว", "save", "secondary"))));
  }

  function returnPanel(booking) {
    if (actor.role !== "staff" || booking.drop !== actor.branch || booking.status !== "renting") return "";
    const dmgPresets = [
      ["ไม่มีความเสียหาย (฿0)", 0],
      ["รอยขีดข่วนกันชน (฿2,500)", 2500],
      ["ล้อแม็กถลอก (฿1,500)", 1500],
      ["รอยบุบประตู (฿4,500)", 4500]
    ];
    const fuelPresets = [
      ["น้ำมันครบ (฿0)", 0],
      ["ขาด 1/8 ถัง (฿400)", 400],
      ["ขาด 2/8 ถัง (฿800)", 800],
      ["ขาดครึ่งถัง (฿1,600)", 1600]
    ];
    return section("ตรวจสภาพและรับคืนรถ (DFD 3.4, 3.5 & 4.3)", inspectionSummary("สภาพตอนส่งมอบ", booking.pickup) +
      form("returnCar", hidden("id", booking.id) + inspectionFields(booking, true) +
      `<div class="chip-bar"><small class="muted">ตัวช่วยคิดค่าน้ำมันขาด:</small>${fuelPresets.map(([label, val]) =>
        `<button type="button" class="chip" data-action="set-fee" data-target="fuelFee" data-id="${val}">${safe(label)}</button>`
      ).join("")}</div>` +
      `<div class="chip-bar"><small class="muted">ตัวช่วยประเมินค่าความเสียหาย:</small>${dmgPresets.map(([label, val]) =>
        `<button type="button" class="chip" data-action="set-fee" data-target="damageFee" data-id="${val}">${safe(label)}</button>`
      ).join("")}</div>` +
      fields(
        input("fuelFee", "ค่าน้ำมันขาด (บาท)", 0, "number", 'required min="0" step="1"') +
        input("damageFee", "ค่าความเสียหาย (บาท)", 0, "number", 'required min="0" step="1"') +
        select("condition", "ผลตรวจหลังรับคืน", statuses.filter(([key]) => ["available", "maintenance"].includes(key)), "available")
      ) + `<div class="callout" id="charge-preview">${chargeDetails({ lateHours: 0, late: 0, fuel: 0, damage: 0, total: 0 })}</div>` +
      actions(submit("ยืนยันรับคืนและออกใบแจ้งหนี้", "issue") + submit("บันทึกรับคืนอย่างเดียว", "save", "secondary"))));
  }

  function invoiceList(booking) {
    const invoices = state.invoices.filter(item => item.bookingId === booking.id);
    const canIssueBalance = actor.role === "staff" && booking.pick === actor.branch && booking.pickup &&
      booking.quote.total > (invoices.find(item => item.kind === "deposit")?.amount || 0) &&
      !invoices.some(item => item.kind === "balance");
    const canIssueReturn = actor.role === "staff" && booking.drop === actor.branch && booking.returned?.charges.total > 0 &&
      !invoices.some(item => item.kind === "extra");
    const rows = invoices.map(item => [
      `<strong class="code">${safe(item.id)}</strong>`,
      safe(invoiceLabels[item.kind]),
      `<strong>${baht(item.amount)}</strong>`,
      badge(item.status),
      actor.role === "customer" ? go("ดูใบแจ้งหนี้ " + invoiceLabels[item.kind], "invoice", item.id) :
        safe(item.reference ? `${item.reference} · ${item.payerBank || "PromptPay"}` : "—")
    ]);
    return section("ใบแจ้งหนี้และการชำระเงิน (DFD Process 4)", invoices.length ? table(["Invoice ID", "ประเภท", "ยอด", "สถานะ", "รายละเอียด"], rows) :
      empty(booking.status === "pending" ? "ใบแจ้งหนี้มัดจำจะออกหลังสาขาอนุมัติ" : "ยังไม่มีใบแจ้งหนี้ที่ต้องชำระ")) +
      (canIssueBalance ? form("issueBalance", hidden("id", booking.id) + actions(submit("ออกใบแจ้งหนี้ค่าเช่าที่เหลือ"))) : "") +
      (canIssueReturn ? form("issueReturn", hidden("id", booking.id) + actions(submit("ออกใบแจ้งหนี้ค่าบริการเพิ่มเติม"))) : "");
  }

  function bookingScreen() {
    const booking = bookingForView();
    const depositPaid = booking.status !== "pending" && model.hasDeposit(state, booking);
    const steps = [
      ["ส่งคำขอ", true], ["อนุมัติ", !!booking.approvedAt], ["มัดจำ", depositPaid],
      ["ลงนาม", booking.contract?.staff && booking.contract?.customer], ["รับรถ", !!booking.pickup], ["คืนรถ", !!booking.returned]
    ];
    const staffPickup = actor.role === "staff" && booking.pick === actor.branch;
    return `${title("การจอง " + booking.id, booking.vehicle + " · ทะเบียน " + booking.plate, "BOOKING DETAIL")}<div class="stack">
      ${section("สถานะการจอง", `<div class="row">${badge(booking.status)}<span class="code">${safe(booking.id)}</span></div>` +
        `<ol class="timeline">${steps.map(([label, done]) => `<li class="${done ? "done" : ""}">${done ? "✓ " : ""}${label}</li>`).join("")}</ol>` +
        (booking.reason ? empty(booking.reason) : "") +
        (booking.approvedAt ? empty("อีเมลยืนยันการจองส่งแล้วในระบบจำลอง") : "") + routeDetails(booking) +
        (booking.difference === undefined ? "" : details([["ส่วนต่างจากการแก้ไขล่าสุด", baht(booking.difference)]])) +
        (actor.role === "customer" ? customerActions(booking) : ""))}
      ${staffPickup && booking.status === "pending" ? reviewForm(booking) : ""}
      ${staffPickup && booking.status === "approved" && !booking.contract ? section("จัดทำสัญญาเช่ารถ (DFD 3.1)", depositPaid ?
        form("contract", hidden("id", booking.id) + actions(submit("สร้างสัญญาเช่ารถ"))) : empty("รอลูกค้าชำระมัดจำก่อนสร้างสัญญา")) : ""}
      ${contractPanel(booking)}
      ${handoverPanel(booking)}
      ${booking.pickup && !booking.returned ? section("บันทึกการส่งมอบ", inspectionSummary("สภาพตอนส่งมอบ", booking.pickup)) : ""}
      ${returnPanel(booking)}
      ${booking.returned ? section("บันทึกการรับคืนและเปรียบเทียบสภาพรถ", `<div class="compare-grid">${inspectionSummary("สภาพตอนส่งมอบ", booking.pickup)}${inspectionSummary("สภาพตอนรับคืน", booking.returned)}</div>` +
        details([["สถานะรถหลังรับคืน", statusLabels[booking.returned.condition]]]) + chargeDetails(booking.returned.charges)) : ""}
      ${invoiceList(booking)}
      </div>`;
  }

  function invoiceScreen() {
    const item = state.invoices.find(invoice => invoice.id === selected);
    const booking = state.bookings.find(record => record.id === item?.bookingId && record.owner === username);
    if (!item || !booking || actor.role !== "customer") throw new Error("ไม่พบใบแจ้งหนี้ในบัญชีนี้");
    const pending = item.status === "unpaid";
    const depAmount = state.invoices.find(inv => inv.bookingId === booking.id && inv.kind === "deposit")?.amount || 0;
    const balanceBreakdown = item.kind === "balance" ? details([
      ["ค่าเช่าก่อนส่วนลด (" + booking.quote.days + " วัน)", baht(booking.quote.base)],
      ["ค่าธรรมเนียมคืนรถต่างสาขา", baht(booking.quote.oneWay)],
      ["ส่วนลดโปรโมชัน", booking.quote.discount ? `−${baht(booking.quote.discount)} (${booking.quote.promotion})` : baht(0)],
      ["ค่าเช่ารวมทั้งสิ้น", baht(booking.quote.total)],
      ["หัก ค่ามัดจำที่ได้รับแล้ว", `−${baht(depAmount)}`],
      ["ยอดค่าเช่าส่วนที่เหลือสุทธิ", baht(item.amount)]
    ]) : "";
    const bankOptions = [
      ["ธนาคารกสิกรไทย (KBank) ****2231", "ธนาคารกสิกรไทย (KBank) ****2231"],
      ["ธนาคารไทยพาณิชย์ (SCB) ****8840", "ธนาคารไทยพาณิชย์ (SCB) ****8840"],
      ["ธนาคารกรุงเทพ (BBL) ****1092", "ธนาคารกรุงเทพ (BBL) ****1092"]
    ];
    return `${title("ใบแจ้งหนี้ " + invoiceLabels[item.kind], item.id + " · " + booking.id, "04 / PAYMENT")}
      <div class="stack narrow">${section("ยอดที่ต้องชำระ", `<div class="row"><strong class="metric">${baht(item.amount)}</strong>${badge(item.status)}</div>` +
        details([["สาขาที่ออกใบแจ้งหนี้", branchName(item.branch)], ["วันเวลาออกใบแจ้งหนี้", when(item.createdAt)],
          ...(item.kind === "deposit" ? [["ครบกำหนดชำระ (ภายใน 24 ชม.)", when(booking.approvedAt + model.day)]] : []),
          ...(item.status === "paid" ? [["อ้างอิงการชำระเงิน", item.reference], ["ธนาคาร/บัญชีผู้ชำระ", item.payerBank || "ธนาคารกสิกรไทย (KBank) ****2231"], ["วันเวลาชำระ", when(item.paidAt)]] : [])]) +
        balanceBreakdown +
        (item.kind === "extra" ? chargeDetails(booking.returned.charges) +
          `<div class="compare-grid">${inspectionSummary("สภาพก่อนส่งมอบ", booking.pickup)}${inspectionSummary("สภาพตอนรับคืน", booking.returned)}</div>` : "") +
        (pending ? `<div class="invoice-card">${demoQr("CR:" + item.id)}<div class="stack"><span class="promptpay-header">THAI QR PromptPay</span><h3>สแกนชำระเงินจำลอง</h3>
          <p class="muted">บริษัท เคออสโรด (ประเทศไทย) จำกัด · Ref: <strong class="code">CR:${safe(item.id)}</strong> · ยอดชำระ <strong>${baht(item.amount)}</strong></p></div></div>` +
          (item.lastFailure ? empty("ชำระเงินไม่สำเร็จ ใบแจ้งหนี้ยังเปิดให้ลองอีกครั้ง") : "") +
          form("pay", hidden("invoiceId", item.id) +
            select("payerBank", "เลือกธนาคาร/บัญชีผู้ชำระ (จำลอง PromptPay)", bankOptions, bankOptions[0][0]) +
            actions(submit("จำลองชำระสำเร็จ", "paid") + submit("จำลองชำระไม่สำเร็จ", "failed", "secondary"))) +
          (item.kind === "deposit" ? actions(button("จำลองเลยกำหนด 24 ชม.", 'data-action="expire"', "secondary")) : "") : "") +
        actions(go("กลับไปการจอง", "booking", booking.id)))}</div>`;
  }

  function manageBooking(cancel) {
    const booking = bookingForView();
    const cancelReasons = ["เปลี่ยนแผนการเดินทาง", "ต้องการเปลี่ยนรุ่นรถยนต์", "จองผิดวันหรือผิดสาขา", "ติดภารกิจเร่งด่วน"];
    return title(cancel ? "ยกเลิกการจอง" : "เปลี่ยนรายละเอียดการคืน", booking.id + " · " + booking.vehicle, "02 / BOOKING") +
      section("รายละเอียดเดิม", routeDetails(booking) + (cancel ? form("cancel", hidden("id", booking.id) +
        (state.invoices.some(item => item.bookingId === booking.id && item.kind === "deposit" && item.status === "paid") ?
          empty("ค่ามัดจำที่ชำระแล้วจะถูกเก็บตามเงื่อนไขการยกเลิก") : empty("ยกเลิกก่อนชำระมัดจำได้โดยไม่มีค่าใช้จ่าย")) +
        `<div class="chip-bar"><small class="muted">เลือกเหตุผลด่วน:</small>${cancelReasons.map(r =>
          `<button type="button" class="chip" data-action="fill-reason" data-target="reason" data-id="${safe(r)}">${safe(r)}</button>`
        ).join("")}</div>` +
        notes("reason", "เหตุผลการยกเลิก", true) +
        actions(submit("ยืนยันยกเลิก", "", "danger") + go("กลับไปการจอง", "booking", booking.id))) :
        form("change", hidden("id", booking.id) +
          (booking.contract ? empty("เมื่อเปลี่ยนเส้นทางหรือวันคืน พนักงานจะสร้างสัญญาฉบับใหม่ให้ทั้งสองฝ่ายลงนาม") : "") +
          fields(select("drop", "สาขาคืนรถ", branches, booking.drop) +
          input("end", "วันเวลาคืนรถ", dateInput(booking.end), "datetime-local")) +
          actions(submit("บันทึกและคำนวณใหม่") + go("กลับไปการจอง", "booking", booking.id)))));
  }

  function outbox() {
    const messages = state.messages.filter(item => item.pick === actor.branch);
    return title("อีเมลยืนยัน", branchName(actor.branch) + " · กล่องข้อความจำลอง (DFD 2.5)", "EMAIL SERVICE") +
      section("การส่งอีเมลของสาขา", messages.length ? messages.map(message => `<article class="card">
        <h3>ยืนยันการจอง ${safe(message.bookingId)}</h3>
        ${details([["ถึง", message.to], ["ลูกค้า", message.name], ["ประเภทรถ", message.type],
          ["รับรถ", `${branchName(message.pick)} · ${when(message.start)}`], ["คืนรถ", `${branchName(message.drop)} · ${when(message.end)}`],
          ["สถานะการส่ง", `ส่งแล้ว (จำลอง) · ${when(message.at)}`]])}</article>`).join("") :
        empty("ยังไม่มีอีเมลยืนยันของสาขา"));
  }

  function fleet() {
    const isAdmin = actor.role === "admin";
    const cars = state.cars.filter(car => (isAdmin ? filter === "all" || car.branch === filter : car.branch === actor.branch));
    const availCount = cars.filter(c => c.status === "available").length;
    const rentedCount = cars.filter(c => c.status === "rented").length;
    const maintCount = cars.filter(c => c.status === "maintenance").length;
    const kpiHtml = `<div class="kpi-grid">
      <div class="kpi-card"><span class="muted">รถในรายการ</span><strong class="kpi-value">${cars.length} คัน</strong></div>
      <div class="kpi-card"><span class="muted">พร้อมใช้งาน</span><strong class="kpi-value">${availCount}</strong></div>
      <div class="kpi-card"><span class="muted">อยู่ระหว่างถูกเช่า</span><strong class="kpi-value">${rentedCount}</strong></div>
      <div class="kpi-card"><span class="muted">อยู่ระหว่างซ่อมบำรุง</span><strong class="kpi-value">${maintCount}</strong></div>
    </div>`;
    return title(isAdmin ? "ยานพาหนะ" : "รถประจำสาขา", isAdmin ? "ค้นตามสาขาและจัดการทะเบียนรถ (DFD 5.1 & 5.4)" : branchName(actor.branch), "05 / FLEET") +
      `<div class="stack">${kpiHtml}${section("รายการรถ", (isAdmin ? actions(go("เพิ่มรถ", "vehicle", "", "") +
        form("fleetFilter", actions(select("branch", "กรองตามสาขา", [["all", "ทุกสาขา"], ...branches], filter) + submit("แสดงรายการ")))) : "") +
        (cars.length ? table(["ทะเบียน / รุ่น", "สาขา", "ข้อมูลรถ", "สถานะ", ...(isAdmin ? ["จัดการ"] : [])], cars.map(car => [
          `<strong>${safe(car.plate)}</strong><br>${safe(car.brand + " " + car.model)}`, safe(branchName(car.branch)),
          `${safe(car.type)} · ${safe(car.color)} · ${safe(car.year)}<br><small>${safe(car.fuel)} · ${car.seats} ที่นั่ง · ${car.odometer.toLocaleString()} กม.</small>${car.notes ? `<br><small>${safe(car.notes)}</small>` : ""}`,
          badge(car.status), ...(isAdmin ? [go("แก้ไข " + car.plate, "vehicle", car.id)] : [])
        ])) : empty("ไม่พบรถในสาขาที่เลือก")))}</div>`;
  }

  function vehicleEditor() {
    const car = selected ? model.getVehicle(state, selected) :
      { plate: "", brand: "", model: "", color: "", fuel: "", year: 2024, seats: 5, odometer: 0, type: "Sedan", branch: "BKK", status: "available" };
    const visibleStatuses = statuses.filter(([key]) => key !== "rented" || car.status === "rented");
    return title(selected ? "แก้ไขข้อมูลรถ" : "เพิ่มรถ", car.plate, "05 / FLEET") +
      section("ข้อมูลทะเบียนรถ (DFD 5.1)", form("vehicle", hidden("id", selected) + fields(
        input("plate", "ทะเบียน", car.plate) + input("brand", "ยี่ห้อ", car.brand) + input("model", "รุ่น", car.model) +
        select("type", "ประเภทรถ", types, car.type) + input("color", "สี", car.color) + input("fuel", "เชื้อเพลิง", car.fuel) +
        input("year", "ปี", car.year, "number") + input("seats", "ที่นั่ง", car.seats, "number") +
        input("odometer", "เลขไมล์", car.odometer, "number") + select("branch", "สาขา", branches, car.branch) +
        select("status", "สถานะรถ", visibleStatuses, car.status)
      ) + notes("notes", "หมายเหตุ", false, car.notes) + actions(submit("บันทึกรถ") + go("กลับรายการรถ", "fleet"))) +
        (selected ? form("removeVehicle", hidden("id", selected) + actions(submit("ลบทะเบียนนี้", "", "danger"))) : ""));
  }

  function pricing() {
    if (!selected) return title("ราคาและโปรโมชัน", "กำหนดเงื่อนไขตามทะเบียนรถ (DFD 5.2)", "05 / PRICING") +
      section("ราคาแต่ละทะเบียน", state.cars.length ? table(["ทะเบียน / รถ", "รายวัน", "7 วันขึ้นไป", "มัดจำ", "คืนต่างสาขา", "จัดการ"], state.cars.map(car =>
        [
          `<strong>${safe(car.plate)}</strong> · ${safe(car.brand + " " + car.model)}<br><small class="muted">${safe(model.promotions[car.pricing.promo]?.[0] || "")}</small>`,
          baht(car.pricing.daily), baht(car.pricing.weekly),
          baht(car.pricing.deposit),
          `<small>ในภาค ${baht(car.pricing.regional)}<br>ข้ามภาค ${baht(car.pricing.interregional)}</small>`,
          go("ตั้งราคา " + car.plate, "pricing", car.id)
        ])) : empty("เพิ่มรถก่อนกำหนดราคา"));
    const car = model.getVehicle(state, selected);
    const pricingFields = [
      ["daily", "อัตราเช่าต่อวัน (บาท)"], ["weekly", "อัตราต่อวันเมื่อเช่า 7 วันขึ้นไป (บาท)"], ["deposit", "มัดจำ (บาท)"],
      ["regional", "คืนต่างสาขาภูมิภาคเดียวกัน (บาท)"], ["interregional", "คืนต่างสาขาข้ามภูมิภาค (บาท)"],
      ["late", "ค่าคืนช้าต่อชั่วโมง (บาท)"]
    ];
    return title("ตั้งราคา " + car.plate, car.brand + " " + car.model, "05 / PRICING") +
      section("เงื่อนไขค่าเช่า", form("pricing", hidden("id", car.id) + fields(pricingFields.map(([name, label]) =>
        input(name, label, car.pricing[name], "number", 'required min="0" step="1"')).join("") +
        select("promo", "โปรโมชันอัตโนมัติ", Object.entries(model.promotions).map(([key, [label]]) => [key, label]), car.pricing.promo)) +
        actions(submit("บันทึกราคา") + go("กลับไปรายการราคา", "pricing"))));
  }

  function maintenance() {
    const open = state.maintenance.filter(item => !item.result);
    const history = state.maintenance.filter(item => item.result);
    return title("บำรุงรักษา", "วางแผนตามวันหรือเลขไมล์ ติดตามความคืบหน้า และบันทึกผลการซ่อมบำรุง (DFD 5.3)", "05 / MAINTENANCE") +
      `<div class="stack">${section("แผนบำรุงรักษา (DFD 5.3.3)", actions(go("สร้างแผน", "plan", "", "")) +
        (open.length ? table(["ทะเบียน / งาน", "ช่วงเวลา / อู่", "เงื่อนไข & ความคืบหน้า", "จัดการ"], open.map(item => {
          const car = state.cars.find(c => c.id === item.carId);
          const pct = item.trigger === "km" && item.targetKm && car
            ? Math.min(100, Math.max(10, Math.round((car.odometer / item.targetKm) * 100)))
            : 75;
          return [
            `<strong>${safe(item.plate)}</strong> · ${safe(item.task)}<br><small class="muted">${safe(item.maintType || "เช็กระยะตามคู่มือ")}</small>`,
            `${when(item.start)} → ${when(item.end)}<br><small class="muted">${safe(item.garage || "ศูนย์บริการมาตรฐาน")} · แจ้งเตือน ${safe(item.advanceNotice || "1,000 กม.")}</small>`,
            `${item.trigger === "km" ? `ครบที่ ${item.targetKm?.toLocaleString()} กม. (ปัจจุบัน ${car?.odometer.toLocaleString() || 0} กม.)` : "ตามกำหนดวัน"} · <small>${safe(item.frequency || "ทุก 10,000 กม.")}</small>
             <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`,
            go("บันทึกผล " + item.id, "result", item.id)
          ];
        })) : empty("ยังไม่มีแผนบำรุงรักษาที่เปิดอยู่")))}
      ${section("ประวัติการบำรุงรักษา (DFD 5.3.4)", history.length ? table(["ทะเบียน / งาน", "ผล", "อู่ / อะไหล่", "ค่าใช้จ่าย", "บันทึกเมื่อ"], history.map(item => [
        `<strong>${safe(item.plate)}</strong> · ${safe(item.task)}`,
        safe(item.result.summary),
        `<small>${safe(item.result.garage || "ศูนย์บริการ")}<br>อะไหล่: ${safe(item.result.parts || "—")}</small>`,
        baht(item.result.cost),
        when(item.result.at)
      ])) : empty("ยังไม่มีผลการบำรุงรักษา"))}</div>`;
  }

  function maintenanceEditor(result) {
    if (result) {
      const plan = state.maintenance.find(item => item.id === selected && !item.result);
      if (!plan) throw new Error("ไม่พบแผนที่เปิดอยู่");
      const car = model.getVehicle(state, plan.carId);
      return title("บันทึกผลบำรุงรักษา", plan.plate + " · " + plan.task, "05 / MAINTENANCE") +
        section("ผลบำรุงรักษา (DFD 5.3.2)", form("maintenance", hidden("id", plan.id) +
          notes("result", "ผลการดำเนินงาน / รายการที่ดำเนินการ", true) +
          fields(
            input("parts", "อะไหล่ที่เปลี่ยน", "น้ำมันเครื่องสังเคราะห์, ไส้กรองมาตรฐาน", "text", "") +
            input("garage", "อู่ที่ให้บริการ", plan.garage || "ศูนย์บริการมาตรฐานประจำสาขา", "text", "") +
            input("serviceStart", "วันที่เข้ารับบริการ", when(plan.start).slice(0, 10), "date", "") +
            input("serviceEnd", "วันที่แล้วเสร็จ", when(plan.end).slice(0, 10), "date", "") +
            input("cost", "ค่าใช้จ่าย (บาท)", 0, "number") +
            input("odometer", "เลขไมล์", car.odometer, "number") +
            select("status", "สถานะหลังบำรุงรักษา", statuses.filter(([key]) => key !== "rented"), "available")
          ) +
          actions(submit("บันทึกผล") + go("กลับไปบำรุงรักษา", "maintenance"))));
    }
    const maintTypes = [
      ["เช็กระยะตามคู่มือ", "เช็กระยะตามคู่มือ"],
      ["เปลี่ยนน้ำมันเครื่อง + ไส้กรอง", "เปลี่ยนน้ำมันเครื่อง + ไส้กรอง"],
      ["เปลี่ยนยาง / ตั้งศูนย์ถ่วงล้อ", "เปลี่ยนยาง / ตั้งศูนย์ถ่วงล้อ"],
      ["ตรวจแบตเตอรี่และระบบไฟฟ้า (EV)", "ตรวจแบตเตอรี่และระบบไฟฟ้า (EV)"],
      ["ต่อภาษี / พ.ร.บ. / ประกันภัย", "ต่อภาษี / พ.ร.บ. / ประกันภัย"]
    ];
    return title("สร้างแผนบำรุงรักษา", "ระบบกันรถออกจากผลค้นหาในช่วงที่วางแผนไว้โดยอัตโนมัติ (DFD 5.3.1)", "05 / MAINTENANCE") +
      section("รายละเอียดแผน", state.cars.length ? form("plan", fields(
        select("carId", "ทะเบียนรถ", state.cars.map(car => [car.id, car.plate + " · " + car.model])) +
        select("maintType", "ประเภทการบำรุงรักษา", maintTypes, maintTypes[0][0]) +
        input("task", "งานบำรุงรักษา") +
        input("garage", "อู่ที่กำหนด", "ศูนย์บริการมาตรฐานประจำสาขา", "text", "") +
        input("start", "วันเริ่มต้น", "", "datetime-local") +
        input("end", "วันสิ้นสุด", "", "datetime-local") +
        select("trigger", "เงื่อนไข", [["date", "ตามวัน"], ["km", "ตามเลขไมล์"]], "date") +
        input("targetKm", "เลขไมล์เป้าหมาย (เมื่อเลือกตามเลขไมล์)", "", "number", 'min="0"') +
        input("frequency", "รอบความถี่", "ทุก 10,000 กม. / 6 เดือน", "text", "") +
        input("advanceNotice", "การแจ้งเตือนล่วงหน้า", "1,000 กม. / 14 วัน", "text", "")
      ) + actions(submit("บันทึกแผน") + go("กลับไปบำรุงรักษา", "maintenance"))) : empty("เพิ่มรถก่อนสร้างแผน"));
  }

  function staffFields(employee) {
    const role = employee?.role ?? "staff";
    return accountFields(employee) + fields(
      select("role", "บทบาท", [["staff", roleLabels.staff], ["admin", roleLabels.admin]], role) +
      `<div class="staff-branch" ${role === "admin" ? "hidden" : ""}>${select("branch", "สาขาประจำ", branches, employee?.branch || "BKK")}</div>`
    );
  }

  function accounts() {
    const query = staffFilter.query.toLowerCase();
    const employees = state.users.filter(user => user.role !== "customer" &&
      (staffFilter.branch === "all" || (user.branch || "global") === staffFilter.branch) &&
      [user.name, user.username, user.email].some(value => value.toLowerCase().includes(query)));
    return title("บัญชีพนักงาน", "จัดการข้อมูลบัญชี บทบาท และสาขาที่รับผิดชอบ (DFD 1.3)", "01 / ACCESS") +
      `<div class="stack">${section("บัญชีที่มีอยู่", form("staffFilter", fields(
        input("query", "ค้นหาชื่อ Username หรืออีเมล", staffFilter.query, "search", "") +
        select("branch", "กรองสาขาประจำ", [["all", "แสดงทั้งหมด"], ["global", "ผู้ดูแลทุกสาขา"], ...branches], staffFilter.branch)) +
        actions(submit("ค้นหาบัญชี"))) +
        (employees.length ? table(["Username", "พนักงาน", "บทบาท", "สาขา", "จัดการ"], employees.map(user => [
          `<strong class="code">${safe(user.username)}</strong>`, safe(user.name), roleLabels[user.role], safe(user.branch ? branchName(user.branch) : "ทุกสาขา"),
          go("แก้ไข " + user.username, "staffEdit", user.username)
        ])) : empty("ไม่พบบัญชีตามเงื่อนไข")))}
        ${section("สร้างบัญชีพนักงาน", form("staff", staffFields() + actions(submit("สร้างบัญชีพนักงาน"))))}</div>`;
  }

  function editStaff() {
    const employee = state.users.find(user => user.role !== "customer" && user.username === selected);
    if (!employee) throw new Error("ไม่พบบัญชีพนักงาน");
    return title("แก้ไขบัญชีพนักงาน", employee.name + " · " + employee.username, "01 / ACCESS") +
      section("ข้อมูลบัญชี", form("staff", hidden("existing", employee.username) + staffFields(employee) +
        actions(submit("บันทึกบัญชี") + go("กลับไปบัญชีพนักงาน", "accounts"))) +
        (employee.username === username ? "" : form("removeStaff", hidden("existing", employee.username) +
          actions(submit("ลบบัญชีนี้", "", "danger")))));
  }

  function reports() {
    const selection = report || { kind: "revenue", branch: "all", from: "2026-11-01", to: "2026-11-30" };
    const start = model.time(selection.from + "T00:00");
    const end = model.time(selection.to + "T00:00") + model.day;
    const reportTypes = [["revenue", "รายงานรายได้"], ["utilization", "รายงานการใช้งานรถ"], ["efficiency", "รายงานประสิทธิภาพ"]];
    const inRange = value => value >= start && value < end;
    const sums = Object.keys(invoiceLabels);
    let grandRevenue = 0;
    const data = branches.filter(([code]) => selection.branch === "all" || selection.branch === code).map(([code, label]) => {
      const payments = state.invoices.filter(item => item.branch === code && item.status === "paid" && inRange(item.paidAt));
      const totals = sums.map(kind => payments.filter(item => item.kind === kind).reduce((total, item) => total + item.amount, 0));
      const branchSum = totals.reduce((a, b) => a + b, 0);
      grandRevenue += branchSum;
      const requests = state.bookings.filter(item => item.pick === code && inRange(item.createdAt));
      const returns = state.bookings.filter(item => item.drop === code && inRange(item.returned?.recordedAt));
      const rentals = state.bookings.filter(item => item.pick === code && item.pickup && item.pickup.recordedAt < end &&
        (item.returned?.recordedAt ?? model.now(state)) > start);
      const cars = new Set([...state.cars.filter(car => car.branch === code).map(car => car.id), ...rentals.map(item => item.carId)]);
      const hours = rentals.reduce((total, item) => total + Math.max(0, Math.min(end, item.returned?.recordedAt ?? model.now(state)) -
        Math.max(start, item.pickup.recordedAt)) / model.hour, 0);
      if (selection.kind === "revenue") return [safe(label), ...totals.map(baht), `<strong>${baht(branchSum)}</strong>`];
      if (selection.kind === "utilization") {
        const pct = cars.size ? (100 * hours / (cars.size * (end - start) / model.hour)).toFixed(1) : null;
        return [safe(label), cars.size, hours.toFixed(1), pct ? `${pct}%` : "—"];
      }
      return [safe(label), requests.length, requests.filter(item => item.approvedAt).length,
        requests.filter(item => item.status === "rejected").length, requests.filter(item => item.status === "cancelled").length,
        returns.length, returns.filter(item => item.returned.charges.lateHours > 0).length,
        state.maintenance.filter(item => item.branch === code && inRange(item.result?.at)).length];
    });
    const labels = {
      revenue: ["สาขา", "มัดจำ", "ค่าเช่าที่เหลือ", "ค่าบริการเพิ่มเติม", "ยอดรับจริง"],
      utilization: ["สาขา", "รถในฐานคำนวณ", "ชั่วโมงใช้งาน", "Utilization"],
      efficiency: ["สาขา", "คำขอ", "เคยอนุมัติ", "ปฏิเสธ", "ยกเลิก", "รับคืน", "คืนช้า", "บำรุงเสร็จ"]
    };
    const descriptions = {
      revenue: "นับใบแจ้งหนี้ที่ชำระสำเร็จตามวันเวลาชำระ มัดจำและค่าเช่าลงสาขารับรถ ค่าบริการเพิ่มเติมลงสาขาคืนรถ (DFD 6.1)",
      utilization: "ชั่วโมงใช้งานจริงในช่วงที่เลือก ÷ ชั่วโมงในช่วง × จำนวนรถในฐานคำนวณ โดยใช้รถประจำสาขาปัจจุบันและรถที่เช่าจากสาขาในช่วงนั้น (DFD 6.2)",
      efficiency: "นับคำขอตามวันสร้างรายการ รับคืนตามวันรับจริง และงานบำรุงตามวันที่บันทึกผล (DFD 6.3)"
    };
    const summaryBanner = selection.kind === "revenue"
      ? `<div class="kpi-grid"><div class="kpi-card dark"><span class="muted">รายได้รวมที่ชำระแล้วในช่วงเวลาที่เลือก</span><strong class="kpi-value">${baht(grandRevenue)}</strong></div></div>`
      : "";
    return title("รายงาน", "เลือกสาขา ช่วงเวลา และประเภทรายงาน (DFD 6.1–6.3)", "06 / ANALYTICS") +
      `<div class="stack">${summaryBanner}${section("ตัวกรองรายงาน", form("reports", fields(select("kind", "ประเภทรายงาน", reportTypes, selection.kind) +
        select("branch", "สาขา", [["all", "ทุกสาขา"], ...branches], selection.branch) +
        input("from", "จากวันที่", selection.from, "date") + input("to", "ถึงวันที่", selection.to, "date")) +
        actions(submit("แสดงรายงาน"))) + `<p class="muted">${descriptions[selection.kind]}</p>` + table(labels[selection.kind], data))}</div>`;
  }

  const screens = {
    search: searchScreen, request: requestScreen, bookings: () => customerBookings(false), history: () => customerBookings(true),
    queue, booking: bookingScreen, invoice: invoiceScreen, change: () => manageBooking(false), cancel: () => manageBooking(true),
    outbox, fleet, vehicle: vehicleEditor, pricing, maintenance, plan: () => maintenanceEditor(false),
    result: () => maintenanceEditor(true), accounts, staffEdit: editStaff, reports
  };
  const permitted = {
    customer: ["search", "request", "bookings", "history", "booking", "invoice", "change", "cancel"],
    staff: ["queue", "booking", "fleet", "outbox"],
    admin: ["fleet", "vehicle", "pricing", "maintenance", "plan", "result", "accounts", "staffEdit", "reports"]
  };
  const parentView = {
    request: "search", invoice: "bookings", booking: actorRole => actorRole === "staff" ? "queue" : "bookings",
    change: "bookings", cancel: "bookings", vehicle: "fleet", plan: "maintenance", result: "maintenance", staffEdit: "accounts"
  };

  function hydrateInlineDocs() {
    for (const img of main.querySelectorAll("img[data-doc-key]")) {
      const key = img.dataset.docKey;
      if (!key || key.startsWith("demo-")) continue;
      fileOperation("readonly", store => store.get(key)).then(record => {
        if (record?.file && ["image/png", "image/jpeg", "image/webp"].includes(record.file.type)) {
          const url = URL.createObjectURL(record.file);
          img.onload = img.onerror = () => URL.revokeObjectURL(url);
          img.src = url;
        }
      }).catch(() => {});
    }
  }

  function setupSignaturePad() {
    const canvas = main.querySelector("canvas.sig-canvas");
    if (!canvas || canvas._bound) return;
    canvas._bound = true;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d3a7a";
    let drawing = false;
    const pos = e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
    };
    canvas.addEventListener("pointerdown", e => {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      const formEl = canvas.closest("form");
      if (formEl) {
        if (!formEl.elements.signature.value.trim()) {
          formEl.elements.signature.value = canvas.dataset.defaultSigner || actor?.name || "Signed";
        }
        if (formEl.elements.consent) formEl.elements.consent.checked = true;
        if (formEl.elements.drawnSig) formEl.elements.drawnSig.value = canvas.toDataURL("image/png");
      }
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointerleave", stop);
  }

  function render() {
    try {
      state = model.snapshot();
      actor = state.users.find(user => user.username === username);
      const quickAccounts = [
        ["customer", "ลูกค้า"],
        ["staff.bkk", "พนง. BKK"],
        ["staff.cnx", "พนง. CNX"],
        ["admin", "Admin"]
      ];
      const quickBar = `<div class="quick-switcher" aria-label="สลับบัญชีด่วน">${quickAccounts.map(([acc, label]) =>
        `<button type="button" class="${username === acc ? "active-switch" : ""}" data-action="quick-user" data-id="${acc}">${label}</button>`
      ).join("")}</div>`;
      session.innerHTML = `<span class="time">เวลาจำลอง ${when(model.now(state))}</span>` + quickBar + (actor ?
        `<span>${safe(roleLabels[actor.role])}${actor.branch ? " · " + safe(actor.branch) : ""} (${safe(actor.name)})</span><button data-action="logout">สลับบทบาท</button>` : "");
      if (view === "workspace" && actor) view = navigation[actor.role][0][0];
      if (view === "home" || !actor || view === "login" || view === "register") {
        main.innerHTML = view === "login" ? login() : view === "register" ? registration() : home();
      } else {
        if (!permitted[actor.role].includes(view)) throw new Error("หน้านี้อยู่นอกสิทธิ์ของบัญชี");
        const parent = typeof parentView[view] === "function" ? parentView[view](actor.role) : parentView[view] || view;
        if (actor.role === "customer") {
          main.innerHTML = `<nav class="customer-subnav" aria-label="เมนูพอร์ทัล">
            <div class="subnav-pills">
              ${navigation.customer.map(([screen, label]) => `<button type="button" data-go="${screen}" ${screen === parent ? 'aria-current="page"' : ""}>${label}</button>`).join("")}
            </div>
            <span class="muted">ผู้เช่า: <strong>${safe(actor.name)}</strong> (@${safe(actor.username)})</span>
          </nav><div>${screens[view]()}</div>`;
        } else {
          const branchBox = actor.branch
            ? `<div class="branch-box">สาขาที่สังกัด<strong>${safe(branchName(actor.branch))}</strong>${safe(model.branches[actor.branch]?.[2] || "")}</div>`
            : `<div class="branch-box">บัญชีที่ใช้งาน<strong>${safe(actor.name)}</strong>@${safe(actor.username)}</div>`;
          main.innerHTML = `<div class="shell"><nav class="sidebar" aria-label="เมนูพอร์ทัล"><p class="eyebrow">${safe(actor.role)}</p>${branchBox}
            ${navigation[actor.role].map(([screen, label]) => `<button type="button" data-go="${screen}" ${screen === parent ? 'aria-current="page"' : ""}>${label}</button>`).join("")}
            </nav><div>${screens[view]()}</div></div>`;
        }
      }
      hydrateInlineDocs();
      setupSignaturePad();
    } catch (error) {
      main.innerHTML = title("เปิดหน้านี้ไม่ได้") + empty(error.message) + actions(go("กลับหน้าหลัก", "home"));
    }
    main.querySelector("h1")?.setAttribute("tabindex", "-1");
  }

  function filesDatabase() {
    if (!attachmentDb) {
      attachmentDb = new Promise((resolve, reject) => {
        const request = indexedDB.open("chaosroad.demo.files", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "key" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("เปิดที่เก็บไฟล์ทดลองไม่ได้ กรุณาใช้เบราว์เซอร์ที่อนุญาต IndexedDB"));
      });
    }
    return attachmentDb;
  }

  async function fileOperation(mode, operation) {
    const db = await filesDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", mode);
      const request = operation(tx.objectStore("files"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(new Error("จัดเก็บหรือเปิดไฟล์ไม่ได้ กรุณาลองใหม่"));
      tx.onabort = tx.onerror;
    });
  }

  function prepareFile(file, imagesOnly = false) {
    if (!file?.size) return null;
    const types = ["image/png", "image/jpeg", "image/webp"];
    if (!imagesOnly) types.push("application/pdf");
    if (!types.includes(file.type) || file.size > 10 * 1024 * 1024) {
      throw new Error("เลือกไฟล์ชนิดที่รองรับ ขนาดไม่เกิน 10 MB");
    }
    return { file, key: crypto.randomUUID(), name: file.name, size: file.size };
  }

  async function withAttachments(command, data) {
    const entries = ["identity", "licence", "photo"].filter(name => data[name]?.size).map(name =>
      [name, prepareFile(data[name], name === "photo")]);
    try {
      for (const [name, record] of entries) {
        await fileOperation("readwrite", store => store.put(record));
        data[name] = { key: record.key, name: record.name, size: record.size };
      }
      if (!data.photo?.key) data.photo = null;
      return model.run(command, username, data);
    } catch (error) {
      await Promise.allSettled(entries.map(([, record]) => fileOperation("readwrite", store => store.delete(record.key))));
      throw error;
    }
  }

  function putSampleFiles(formEl) {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 220;
    const context = canvas.getContext("2d");
    const holder = actor?.name || "พิมพ์ใจ ทดสอบ";
    const tasks = [
      ["identity", "SAMPLE-ID.png", "DEMO ID CARD", "#1d5bb8", "1-1037-00458-12-3"],
      ["licence", "SAMPLE-LICENCE.png", "DEMO DRIVING LICENCE", "#c95a0c", "DL 58-001247 · Exp 14/03/2572"]
    ];
    return tasks.reduce((sequence, [name, filename, label, barColor, docNo]) => sequence.then(() => new Promise(resolve => {
      context.fillStyle = "#faf5ee";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = barColor;
      context.fillRect(0, 0, canvas.width, 44);
      context.fillStyle = "#ffffff";
      context.font = "bold 17px sans-serif";
      context.fillText(label + " · CHAOSROAD", 18, 28);
      context.fillStyle = "#ded6cd";
      context.fillRect(20, 62, 76, 98);
      context.fillStyle = "#221d1a";
      context.font = "bold 17px monospace";
      context.fillText(docNo, 114, 84);
      context.font = "bold 16px sans-serif";
      context.fillText("Name: " + holder, 114, 116);
      context.font = "14px sans-serif";
      context.fillStyle = "#1e7a3c";
      context.fillText("Status: VALID / VERIFIED SAMPLE", 114, 146);
      context.fillStyle = "#6e655c";
      context.fillText("ChaosRoad · synthetic test file", 20, 194);
      canvas.toBlob(blob => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], filename, { type: "image/png" }));
        formEl.elements[name].files = transfer.files;
        formEl.elements[name].dispatchEvent(new Event("change", { bubbles: true }));
        resolve();
      }, "image/png");
    })), Promise.resolve());
  }

  document.addEventListener("click", async event => {
    const target = event.target.closest("button[data-go], button[data-action]");
    if (!target) return;
    const id = target.dataset.id || "";
    if (target.dataset.go) {
      if (target.dataset.go === "login") loginRole = Object.hasOwn(roleLabels, id) ? id : "customer";
      navigate(target.dataset.go, id);
      return;
    }
    try {
      switch (target.dataset.action) {
        case "logout": signOut(); break;
        case "quick-user": {
          const targetUser = state.users.find(u => u.username === id);
          if (targetUser) {
            setActor(targetUser, true);
            notify(`สลับไปยังบัญชี ${targetUser.name} (${roleLabels[targetUser.role]}) แล้ว`);
          }
          break;
        }
        case "hero-book": {
          const car = model.getVehicle(state, id);
          if (!actor || actor.role !== "customer") {
            const cust = state.users.find(u => u.role === "customer");
            username = cust.username;
            sessionStorage.setItem("chaosroad.user", username);
          }
          search = {
            pick: car.branch,
            drop: car.branch,
            type: car.type,
            start: dateInput(model.now(state) + 2 * model.day).slice(0, 10) + "T10:00",
            end: dateInput(model.now(state) + 6 * model.day).slice(0, 10) + "T10:00"
          };
          navigate("request", car.id);
          break;
        }
        case "fill-login": {
          const formEl = main.querySelector('form[data-form="login"]');
          formEl.elements.username.value = id;
          formEl.elements.password.value = model.demoPassword;
          formEl.elements.username.focus();
          break;
        }
        case "pick-type": {
          const formEl = main.querySelector('form[data-form="search"]');
          if (formEl) {
            formEl.elements.type.value = id;
            const data = Object.fromEntries(new FormData(formEl));
            const trip = model.parseTrip(data);
            if (trip.start > model.now(state)) {
              search = data;
              navigate("search");
            }
          }
          break;
        }
        case "fill-reason": {
          const fieldName = target.dataset.target || "reason";
          const inputEl = main.querySelector(`[name="${fieldName}"]`);
          if (inputEl) {
            inputEl.value = id;
            inputEl.focus();
          }
          break;
        }
        case "set-fuel": {
          const fuelInput = main.querySelector('input[name="fuel"]');
          if (fuelInput) {
            fuelInput.value = id;
            for (const btn of main.querySelectorAll(".fuel-step")) {
              btn.classList.toggle("filled", Number(btn.dataset.id) <= Number(id));
            }
            fuelInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;
        }
        case "set-fee": {
          const feeField = target.dataset.target;
          const feeInput = main.querySelector(`input[name="${feeField}"]`);
          if (feeInput) {
            feeInput.value = id;
            feeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;
        }
        case "clear-sig": {
          const canvas = main.querySelector("canvas.sig-canvas");
          if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const formEl = canvas.closest("form");
            if (formEl?.elements.drawnSig) formEl.elements.drawnSig.value = "";
          }
          break;
        }
        case "load-rich":
          model.loadRichDemo();
          search = null;
          report = null;
          render();
          notify("โหลดข้อมูลตัวอย่างครบวงจรแล้ว (มีรายการรออนุมัติ กำลังเช่า เสร็จสิ้น แผนซ่อมบำรุง และรายงานรายได้)");
          break;
        case "reset":
          if (!window.confirm("รีเซ็ตการจอง บัญชี และไฟล์ทดลองทั้งหมดในเบราว์เซอร์นี้?")) break;
          await fileOperation("readwrite", store => store.clear());
          model.reset();
          search = null;
          report = null;
          staffFilter = { branch: "all", query: "" };
          signOut();
          notify("รีเซ็ตข้อมูลและเวลาจำลองแล้ว");
          break;
        case "expire": {
          const item = state.invoices.find(invoice => invoice.id === selected);
          model.advance();
          navigate("booking", item.bookingId);
          notify("เดินเวลาจำลอง 24 ชั่วโมงแล้ว");
          break;
        }
        case "sample-files":
          await putSampleFiles(target.closest("form"));
          notify("แนบไฟล์ตัวอย่างทั้งสองรายการแล้ว");
          break;
        case "download": {
          if (id.startsWith("demo-")) {
            const link = document.createElement("a");
            link.href = syntheticDocDataUrl(id);
            link.download = target.dataset.filename || "sample-document.svg";
            link.click();
            break;
          }
          const record = await fileOperation("readonly", store => store.get(id));
          if (!record) throw new Error("ไฟล์นี้ไม่อยู่ในที่เก็บของเบราว์เซอร์");
          const link = document.createElement("a");
          link.href = URL.createObjectURL(record.file);
          link.download = record.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 3000);
          break;
        }
      }
    } catch (error) {
      notify(error.message, true);
    }
  });

  const destinations = {
    vehicle: "fleet", removeVehicle: "fleet", pricing: "pricing",
    plan: "maintenance", maintenance: "maintenance", staff: "accounts", removeStaff: "accounts"
  };
  const successMessages = {
    request: "ส่งคำขอจองแล้ว", review: "บันทึกผลตรวจสอบแล้ว", change: "บันทึกการเปลี่ยนแปลงและคำนวณราคาใหม่แล้ว",
    cancel: "ยกเลิกการจองแล้ว", contract: "สร้างสัญญาเช่ารถแล้ว", sign: "บันทึกลายเซ็นแล้ว",
    handover: "บันทึกส่งมอบรถแล้ว", returnCar: "บันทึกรับคืนรถแล้ว"
  };

  main.addEventListener("submit", async event => {
    const formEl = event.target.closest("form[data-form]");
    if (!formEl) return;
    event.preventDefault();
    const command = formEl.dataset.form;
    const data = Object.fromEntries(new FormData(formEl));
    const outcome = event.submitter?.value || "";
    if (event.submitter) event.submitter.disabled = true;
    try {
      switch (command) {
        case "login": setActor(model.authenticate({ ...data, role: loginRole })); return;
        case "register":
          if (data.password !== data.confirm) throw new Error("รหัสผ่านและการยืนยันไม่ตรงกัน");
          setActor(model.register(data));
          notify("สร้างบัญชีลูกค้าแล้ว");
          return;
        case "hero-search":
        case "search": {
          const trip = model.parseTrip(data);
          if (trip.start <= model.now(state)) throw new Error("เลือกรับรถหลังเวลาจำลองปัจจุบัน");
          if (!actor || actor.role !== "customer") {
            const cust = state.users.find(u => u.role === "customer");
            username = cust.username;
            sessionStorage.setItem("chaosroad.user", username);
          }
          search = data;
          navigate("search");
          return;
        }
        case "fleetFilter": filter = data.branch; navigate("fleet"); return;
        case "staffFilter": staffFilter = { branch: data.branch, query: data.query.trim() }; navigate("accounts"); return;
        case "reports":
          if (!(data.from <= data.to)) throw new Error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น");
          report = data;
          navigate("reports");
          return;
        case "request": Object.assign(data, search, { carId: selected }); break;
        case "review": data.outcome = outcome; break;
        case "handover":
        case "returnCar": data.issue = outcome === "issue"; break;
        case "pay": data.outcome = outcome; break;
        case "removeVehicle":
          if (!window.confirm("ลบทะเบียนรถนี้จากข้อมูลทดลอง?")) return;
          break;
        case "removeStaff":
          if (!window.confirm("ลบบัญชีนี้จากข้อมูลทดลอง?")) return;
          break;
      }
      const result = ["request", "handover", "returnCar"].includes(command) ?
        await withAttachments(command, data) : model.run(command, username, data);
      if (command === "pay") {
        navigate("invoice", data.invoiceId);
        notify(outcome === "paid" ? "ระบบจำลองยืนยันการชำระเงินแล้ว" : "ชำระเงินไม่สำเร็จ ลองชำระใหม่ได้", outcome !== "paid");
      } else {
        const destination = destinations[command] || "booking";
        navigate(destination, destination === "booking" ? data.id || result.id : "");
        notify(successMessages[command] || "บันทึกข้อมูลแล้ว");
      }
    } catch (error) {
      notify(error.message, true);
    } finally {
      if (event.submitter) event.submitter.disabled = false;
    }
  });

  main.addEventListener("input", event => {
    const formEl = event.target.closest('form[data-form="returnCar"]');
    if (!formEl || !formEl.elements.recordedAt.value) return;
    const charges = model.returnCharges(bookingForView(), Object.fromEntries(new FormData(formEl)));
    document.querySelector("#charge-preview").innerHTML = chargeDetails(charges);
  });

  main.addEventListener("change", event => {
    const target = event.target;
    if (target.matches('form[data-form="staff"] select[name="role"]')) {
      target.form.querySelector(".staff-branch").hidden = target.value === "admin";
    }
    if (target.type !== "file") return;
    const preview = target.parentElement.querySelector(".attachment-preview");
    const file = target.files[0];
    preview.replaceChildren();
    if (!file) return;
    preview.append(document.createTextNode(file.name + " · " + Math.ceil(file.size / 1024) + " KB"));
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024) {
      const thumbnail = document.createElement("img");
      const url = URL.createObjectURL(file);
      thumbnail.onload = thumbnail.onerror = () => URL.revokeObjectURL(url);
      thumbnail.alt = "ตัวอย่างไฟล์ที่แนบ";
      thumbnail.src = url;
      preview.append(thumbnail);
    }
  });

  window.addEventListener("storage", event => {
    if (event.key === "chaosroad.demo.v1" && !main.contains(document.activeElement)) render();
  });
  setInterval(() => {
    if (state?.bookings.some(booking => booking.status === "approved" &&
      booking.approvedAt + model.day <= model.now(state) && !model.hasDeposit(state, booking))) render();
  }, 15000);
  render();
})();
