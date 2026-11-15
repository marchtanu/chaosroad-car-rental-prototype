"use strict";

(function startApp() {
  const model = ChaosRoad;
  const ui = ChaosRoadUI;
  const screens = ChaosRoadScreens;

  const main = document.querySelector("#main");
  const notice = document.querySelector("#notice");
  const session = document.querySelector("#session");

  const navigation = {
    customer: [
      ["search", "ค้นหารถ"],
      ["bookings", "การจองของฉัน"],
      ["history", "ประวัติการเช่า"],
    ],
    staff: [
      ["queue", "การจองสาขา"],
      ["fleet", "รถประจำสาขา"],
      ["outbox", "อีเมลยืนยัน"],
    ],
    admin: [
      ["fleet", "ยานพาหนะ"],
      ["pricing", "ราคาและโปรโมชัน"],
      ["maintenance", "บำรุงรักษา"],
      ["reports", "รายงาน"],
      ["accounts", "บัญชีพนักงาน"],
    ],
  };

  const permitted = {
    customer: [
      "search",
      "request",
      "bookings",
      "history",
      "booking",
      "invoice",
      "change",
      "cancel",
    ],
    staff: ["queue", "booking", "fleet", "outbox"],
    admin: [
      "fleet",
      "vehicle",
      "pricing",
      "maintenance",
      "plan",
      "result",
      "accounts",
      "staffEdit",
      "reports",
    ],
  };

  const parentView = {
    request: "search",
    invoice: "bookings",
    booking: (actorRole) => (actorRole === "staff" ? "queue" : "bookings"),
    change: "bookings",
    cancel: "bookings",
    vehicle: "fleet",
    plan: "maintenance",
    result: "maintenance",
    staffEdit: "accounts",
  };

  const destinations = {
    vehicle: "fleet",
    removeVehicle: "fleet",
    pricing: "pricing",
    plan: "maintenance",
    maintenance: "maintenance",
    staff: "accounts",
    removeStaff: "accounts",
  };

  const successMessages = {
    request: "ส่งคำขอจองแล้ว",
    review: "บันทึกผลตรวจสอบแล้ว",
    change: "บันทึกการเปลี่ยนแปลงและคำนวณราคาใหม่แล้ว",
    cancel: "ยกเลิกการจองแล้ว",
    contract: "สร้างสัญญาเช่ารถแล้ว",
    sign: "บันทึกลายเซ็นแล้ว",
    handover: "บันทึกส่งมอบรถแล้ว",
    returnCar: "บันทึกรับคืนรถแล้ว",
  };

  let state = model.snapshot();
  let username = sessionStorage.getItem("chaosroad.user") || "";
  let actor = state.users.find((user) => user.username === username);
  let view = actor ? navigation[actor.role][0][0] : "home";
  let selected = "";
  let loginRole = "customer";
  let search = null;
  let filter = "all";
  let staffFilter = { branch: "all", query: "" };
  let report = null;
  let attachmentDb = null;

  function notify(message = "", error = false) {
    notice.textContent = message;
    notice.className = error ? "notice error" : "notice";
  }

  function navigate(screen, id = "") {
    view = screen;
    selected = id;
    notify();
    render();
    window.scrollTo({ top: 0 });
  }

  function setActor(user, keepCurrentBooking = false) {
    username = user.username;
    sessionStorage.setItem("chaosroad.user", username);
    if (user.role !== "customer") search = null;
    if (keepCurrentBooking && view === "booking" && selected) {
      const booking = state.bookings.find((b) => b.id === selected);
      const staffCanSee =
        user.role === "staff" &&
        booking &&
        (booking.pick === user.branch || booking.drop === user.branch);
      const customerCanSee =
        user.role === "customer" && booking && booking.owner === user.username;
      if (staffCanSee || customerCanSee) {
        navigate("booking", selected);
        return;
      }
    }
    navigate(navigation[user.role][0][0]);
  }

  function signOut() {
    username = "";
    sessionStorage.removeItem("chaosroad.user");
    navigate("home");
  }

  function currentContext() {
    return {
      state,
      actor,
      username,
      selected,
      loginRole,
      search,
      filter,
      staffFilter,
      report,
      demoQr: typeof demoQr === "function" ? demoQr : () => "",
    };
  }

  function hydrateInlineDocs() {
    for (const img of main.querySelectorAll("img[data-doc-key]")) {
      const key = img.dataset.docKey;
      if (!key || key.startsWith("demo-")) continue;
      fileOperation("readonly", (store) => store.get(key))
        .then((record) => {
          if (record?.file && record.file.type.startsWith("image/")) {
            const url = URL.createObjectURL(record.file);
            img.onload = () => URL.revokeObjectURL(url);
            img.src = url;
          }
        })
        .catch(() => {});
    }
  }

  function setupSignaturePad() {
    const canvas = main.querySelector("canvas.sig-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    let drawing = false;
    const pos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [
        ((e.clientX - rect.left) * canvas.width) / rect.width,
        ((e.clientY - rect.top) * canvas.height) / rect.height,
      ];
    };
    const startDraw = (e) => {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const moveDraw = (e) => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const endDraw = () => {
      if (!drawing) return;
      drawing = false;
      const formEl = canvas.closest("form");
      if (formEl?.elements.drawnSig) {
        formEl.elements.drawnSig.value = canvas.toDataURL("image/png");
      }
      if (formEl?.elements.signature && !formEl.elements.signature.value.trim()) {
        formEl.elements.signature.value = canvas.dataset.defaultSigner || "";
      }
    };
    canvas.addEventListener("pointerdown", startDraw);
    canvas.addEventListener("pointermove", moveDraw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);
  }

  function renderSessionBar() {
    const quickAccounts = [
      ["customer", "ลูกค้า"],
      ["staff.bkk", "พนง. BKK"],
      ["staff.cnx", "พนง. CNX"],
      ["admin", "Admin"],
    ];
    const quickBar = `<div class="quick-switcher" aria-label="สลับบัญชีด่วน">${quickAccounts
      .map(
        ([acc, label]) =>
          `<button type="button" class="${username === acc ? "active-switch" : ""}" data-action="quick-user" data-id="${acc}">${label}</button>`,
      )
      .join("")}</div>`;
    session.innerHTML =
      `<span class="time">เวลาจำลอง ${ui.when(model.now(state))}</span>` +
      quickBar +
      (actor
        ? `<span>${ui.safe(ui.roleLabels[actor.role])}${actor.branch ? " · " + ui.safe(actor.branch) : ""} (${ui.safe(actor.name)})</span><button data-action="logout">สลับบทบาท</button>`
        : "");
  }

  function render() {
    try {
      state = model.snapshot();
      actor = state.users.find((user) => user.username === username);
      renderSessionBar();

      if (view === "workspace" && actor) view = navigation[actor.role][0][0];
      const ctx = currentContext();

      if (
        view === "home" ||
        !actor ||
        view === "login" ||
        view === "register"
      ) {
        const publicView =
          view === "login" ? "login" : view === "register" ? "register" : "home";
        main.innerHTML = screens.registry[publicView](ctx);
      } else {
        if (!permitted[actor.role].includes(view)) {
          throw new Error("หน้านี้อยู่นอกสิทธิ์ของบัญชี");
        }
        const parent =
          typeof parentView[view] === "function"
            ? parentView[view](actor.role)
            : parentView[view] || view;
        const navItems = navigation[actor.role]
          .map(
            ([screen, label]) =>
              `<button type="button" data-go="${screen}" ${screen === parent ? 'aria-current="page"' : ""}>${label}</button>`,
          )
          .join("");
        const content = screens.registry[view](ctx);

        if (actor.role === "customer") {
          main.innerHTML = `<nav class="customer-subnav" aria-label="เมนูพอร์ทัล">
            <div class="subnav-pills">${navItems}</div>
            <span class="muted">ผู้เช่า: <strong>${ui.safe(actor.name)}</strong> (@${ui.safe(actor.username)})</span>
          </nav><div class="shell-content">${content}</div>`;
        } else {
          const branchBox = actor.branch
            ? `<div class="branch-box">สาขาที่สังกัด<strong>${ui.safe(ui.branchName(actor.branch))}</strong>${ui.safe(model.branches[actor.branch]?.[2] || "")}</div>`
            : `<div class="branch-box">บัญชีที่ใช้งาน<strong>${ui.safe(actor.name)}</strong>@${ui.safe(actor.username)}</div>`;
          main.innerHTML = `<div class="shell"><nav class="sidebar" aria-label="เมนูพอร์ทัล"><p class="eyebrow">${ui.safe(actor.role)}</p>${branchBox}${navItems}</nav><div class="shell-content">${content}</div></div>`;
        }
      }
      hydrateInlineDocs();
      setupSignaturePad();
    } catch (error) {
      main.innerHTML =
        ui.title("เปิดหน้านี้ไม่ได้") +
        ui.empty(error.message) +
        ui.actions(ui.go("กลับหน้าหลัก", "home"));
    }
    main.querySelector("h1")?.setAttribute("tabindex", "-1");
  }

  function filesDatabase() {
    if (!attachmentDb) {
      attachmentDb = new Promise((resolve, reject) => {
        const request = indexedDB.open("chaosroad.files.v1", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("files")) {
            request.result.createObjectStore("files", { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return attachmentDb;
  }

  async function fileOperation(mode, operation) {
    const db = await filesDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", mode);
      const req = operation(tx.objectStore("files"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function prepareFile(file, imagesOnly = false) {
    if (!file || !file.size) return null;
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      ...(imagesOnly ? [] : ["application/pdf"]),
    ];
    if (!allowed.includes(file.type)) {
      throw new Error("รองรับเฉพาะไฟล์ PNG, JPEG, WebP หรือ PDF");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("ไฟล์แนบต้องมีขนาดไม่เกิน 10 MB");
    }
    const key =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    await fileOperation("readwrite", (store) =>
      store.put({ key, file, name: file.name, type: file.type, size: file.size }),
    );
    return { key, name: file.name, size: file.size };
  }

  async function withAttachments(command, data) {
    const keys = [];
    try {
      for (const field of command === "request"
        ? ["identity", "licence"]
        : ["photo"]) {
        if (data[field] instanceof File && data[field].size) {
          data[field] = await prepareFile(data[field], command !== "request");
          keys.push(data[field].key);
        } else {
          delete data[field];
        }
      }
      return model.run(command, username, data);
    } catch (error) {
      await Promise.allSettled(
        keys.map((key) => fileOperation("readwrite", (store) => store.delete(key))),
      );
      throw error;
    }
  }

  function putSampleFiles(formEl) {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    const holder = actor?.name || "พิมพ์ใจ ทดสอบ";
    const tasks = [
      ["identity", "SAMPLE-ID.png", "NATIONAL ID CARD", "#27272a", "1-1099-00451-89-2"],
      ["licence", "SAMPLE-LICENCE.png", "DRIVING LICENCE", "#166534", "DL-67004812"],
    ];
    return tasks.reduce(
      (sequence, [name, filename, label, barColor, docNo]) =>
        sequence.then(
          () =>
            new Promise((resolve) => {
              ctx.fillStyle = "#faf5ee";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = barColor;
              ctx.fillRect(0, 0, canvas.width, 44);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 17px sans-serif";
              ctx.fillText(label + " · CHAOSROAD", 18, 28);
              ctx.fillStyle = "#ded6cd";
              ctx.fillRect(20, 62, 76, 98);
              ctx.fillStyle = "#221d1a";
              ctx.font = "bold 17px monospace";
              ctx.fillText(docNo, 114, 84);
              ctx.font = "bold 16px sans-serif";
              ctx.fillText("Name: " + holder, 114, 116);
              ctx.font = "14px sans-serif";
              ctx.fillStyle = "#1e7a3c";
              ctx.fillText("Status: VALID / VERIFIED SAMPLE", 114, 146);
              ctx.fillStyle = "#6e655c";
              ctx.fillText("ChaosRoad · synthetic test file", 20, 194);
              canvas.toBlob((blob) => {
                const transfer = new DataTransfer();
                transfer.items.add(new File([blob], filename, { type: "image/png" }));
                formEl.elements[name].files = transfer.files;
                formEl.elements[name].dispatchEvent(
                  new Event("change", { bubbles: true }),
                );
                resolve();
              }, "image/png");
            }),
        ),
      Promise.resolve(),
    );
  }

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-go], button[data-action]");
    if (!target) return;
    const id = target.dataset.id || "";
    if (target.dataset.go) {
      if (target.dataset.go === "login") {
        loginRole = Object.hasOwn(ui.roleLabels, id) ? id : "customer";
      }
      navigate(target.dataset.go, id);
      return;
    }
    try {
      switch (target.dataset.action) {
        case "logout":
          signOut();
          break;
        case "quick-user": {
          const targetUser = state.users.find((u) => u.username === id);
          if (targetUser) {
            setActor(targetUser, true);
            notify(
              `สลับไปยังบัญชี ${targetUser.name} (${ui.roleLabels[targetUser.role]}) แล้ว`,
            );
          }
          break;
        }
        case "hero-book": {
          const car = model.getVehicle(state, id);
          if (!actor || actor.role !== "customer") {
            const cust = state.users.find((u) => u.role === "customer");
            username = cust.username;
            sessionStorage.setItem("chaosroad.user", username);
          }
          search = {
            pick: car.branch,
            drop: car.branch,
            type: car.type,
            start: ui.dateInput(model.now(state) + 2 * model.day).slice(0, 10) + "T10:00",
            end: ui.dateInput(model.now(state) + 6 * model.day).slice(0, 10) + "T10:00",
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
          const feeInput = main.querySelector(`input[name="${target.dataset.target}"]`);
          if (feeInput) {
            feeInput.value = id;
            feeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;
        }
        case "clear-sig": {
          const canvas = main.querySelector("canvas.sig-canvas");
          if (canvas) {
            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
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
          notify(
            "โหลดข้อมูลตัวอย่างครบวงจรแล้ว (มีรายการรออนุมัติ กำลังเช่า เสร็จสิ้น แผนซ่อมบำรุง และรายงานรายได้)",
          );
          break;
        case "reset":
          if (!window.confirm("รีเซ็ตการจอง บัญชี และไฟล์ทดลองทั้งหมดในเบราว์เซอร์นี้?")) break;
          await fileOperation("readwrite", (store) => store.clear());
          model.reset();
          search = null;
          report = null;
          staffFilter = { branch: "all", query: "" };
          signOut();
          notify("รีเซ็ตข้อมูลและเวลาจำลองแล้ว");
          break;
        case "expire": {
          const item = state.invoices.find((invoice) => invoice.id === selected);
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
            link.href = ui.syntheticDocDataUrl(id);
            link.download = target.dataset.filename || "sample-document.svg";
            link.click();
            break;
          }
          const record = await fileOperation("readonly", (store) => store.get(id));
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

  main.addEventListener("submit", async (event) => {
    const formEl = event.target.closest("form[data-form]");
    if (!formEl) return;
    event.preventDefault();
    const command = formEl.dataset.form;
    const data = Object.fromEntries(new FormData(formEl));
    const outcome = event.submitter?.value || "";
    if (event.submitter) event.submitter.disabled = true;
    try {
      switch (command) {
        case "login":
          setActor(model.authenticate({ ...data, role: loginRole }));
          return;
        case "register":
          if (data.password !== data.confirm) {
            throw new Error("รหัสผ่านและการยืนยันไม่ตรงกัน");
          }
          setActor(model.register(data));
          notify("สร้างบัญชีลูกค้าแล้ว");
          return;
        case "hero-search":
        case "search": {
          const trip = model.parseTrip(data);
          if (trip.start <= model.now(state)) {
            throw new Error("เลือกรับรถหลังเวลาจำลองปัจจุบัน");
          }
          if (!actor || actor.role !== "customer") {
            const cust = state.users.find((u) => u.role === "customer");
            username = cust.username;
            sessionStorage.setItem("chaosroad.user", username);
          }
          search = data;
          navigate("search");
          return;
        }
        case "fleetFilter":
          filter = data.branch;
          navigate("fleet");
          return;
        case "staffFilter":
          staffFilter = { branch: data.branch, query: data.query.trim() };
          navigate("accounts");
          return;
        case "reports":
          if (!(data.from <= data.to)) {
            throw new Error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น");
          }
          report = data;
          navigate("reports");
          return;
        case "request":
          Object.assign(data, search, { carId: selected });
          break;
        case "review":
          data.outcome = outcome;
          break;
        case "handover":
        case "returnCar":
          data.issue = outcome === "issue";
          break;
        case "pay":
          data.outcome = outcome;
          break;
        case "removeVehicle":
          if (!window.confirm("ลบทะเบียนรถนี้จากข้อมูลทดลอง?")) return;
          break;
        case "removeStaff":
          if (!window.confirm("ลบบัญชีนี้จากข้อมูลทดลอง?")) return;
          break;
      }
      const result = ["request", "handover", "returnCar"].includes(command)
        ? await withAttachments(command, data)
        : model.run(command, username, data);
      if (command === "pay") {
        navigate("invoice", data.invoiceId);
        notify(
          outcome === "paid"
            ? "ระบบจำลองยืนยันการชำระเงินแล้ว"
            : "ชำระเงินไม่สำเร็จ ลองชำระใหม่ได้",
          outcome !== "paid",
        );
      } else {
        const destination = destinations[command] || "booking";
        navigate(
          destination,
          destination === "booking" ? data.id || result.id : "",
        );
        notify(successMessages[command] || "บันทึกข้อมูลแล้ว");
      }
    } catch (error) {
      notify(error.message, true);
    } finally {
      if (event.submitter) event.submitter.disabled = false;
    }
  });

  main.addEventListener("input", (event) => {
    const formEl = event.target.closest('form[data-form="returnCar"]');
    if (!formEl || !formEl.elements.recordedAt.value) return;
    const charges = model.returnCharges(
      screens.findBookingForView(currentContext()),
      Object.fromEntries(new FormData(formEl)),
    );
    document.querySelector("#charge-preview").innerHTML =
      screens.chargeDetails(charges);
  });

  main.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches('form[data-form="staff"] select[name="role"]')) {
      target.form.querySelector(".staff-branch").hidden = target.value === "admin";
    }
    if (target.type !== "file") return;
    const preview = target.parentElement.querySelector(".attachment-preview");
    const file = target.files[0];
    preview.replaceChildren();
    if (!file) return;
    preview.append(
      document.createTextNode(file.name + " · " + Math.ceil(file.size / 1024) + " KB"),
    );
    if (
      ["image/png", "image/jpeg", "image/webp"].includes(file.type) &&
      file.size <= 10 * 1024 * 1024
    ) {
      const thumbnail = document.createElement("img");
      const url = URL.createObjectURL(file);
      thumbnail.onload = thumbnail.onerror = () => URL.revokeObjectURL(url);
      thumbnail.alt = "ตัวอย่างไฟล์ที่แนบ";
      thumbnail.src = url;
      preview.append(thumbnail);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "chaosroad.demo.v1" && !main.contains(document.activeElement)) {
      render();
    }
  });

  setInterval(() => {
    if (
      state?.bookings.some(
        (booking) =>
          booking.status === "approved" &&
          booking.approvedAt + model.day <= model.now(state) &&
          !model.hasDeposit(state, booking),
      )
    ) {
      render();
    }
  }, 15000);

  render();
})();
