"use strict";

const ChaosRoad = (() => {
  const hour = 3600000;
  const day = 24 * hour;
  const storageKey = "chaosroad.demo.v1";
  const branches = {
    BKK: ["สุวรรณภูมิ", "Central", "อาคารผู้โดยสาร ชั้น 1 ประตู 4"],
    DMK: ["ดอนเมือง", "Central", "อาคารผู้โดยสารภายในประเทศ อาคาร 2"],
    SLM: ["สีลม", "Central", "อาคารสีลมคอมเพล็กซ์ ชั้น G"],
    CNX: ["เชียงใหม่", "North", "อาคารผู้โดยสารสนามบินเชียงใหม่"],
    HKT: ["ภูเก็ต", "South", "อาคารผู้โดยสารในประเทศ ชั้น 1"],
    PTY: ["พัทยา", "East", "ถนนเลียบชายหาดพัทยาเหนือ"],
    KKC: ["ขอนแก่น", "Northeast", "สนามบินขอนแก่น ชั้น 1"]
  };
  const types = ["Eco Car", "Sedan", "SUV", "SUV 7 ที่นั่ง", "EV", "Premium", "กระบะ"];
  const promotions = {
    none: ["ไม่มีโปรโมชัน", 0, 1],
    weekend: ["เช่า 3 วันขึ้นไป ลด 10% (CHAOS10)", 10, 3],
    week: ["เช่า 7 วันขึ้นไป ลด 5% (LONG7)", 5, 7],
    early: ["เช่า 5 วันขึ้นไป ลด 15% (EARLY15)", 15, 5]
  };
  const demoPassword = "Demo1234";
  const defaultPricing = {
    daily: 1290, weekly: 1090, deposit: 3000, regional: 800, interregional: 3500,
    late: 200, promo: "weekend"
  };

  function account(username, role, name, branch = "", phone = "081-234-5678") {
    return { username, role, name, branch, email: username + "@example.test", phone, password: demoPassword };
  }

  function seed() {
    const cars = [
      ["city", "2กข 4581", "Honda", "City e:HEV RS", "Sedan", "BKK", 1290, 3000, "ขาว", "Hybrid", 5, 18000, "ระบบความปลอดภัย Honda SENSING"],
      ["yaris", "1ขก 7742", "Toyota", "Yaris Ativ", "Eco Car", "BKK", 1090, 3000, "เทา", "เบนซิน", 5, 24100, "ประหยัดน้ำมัน 23.3 กม./ลิตร"],
      ["fortuner", "4กพ 8800", "Toyota", "Fortuner Legender", "SUV 7 ที่นั่ง", "BKK", 2590, 8000, "ขาว", "ดีเซล", 7, 31200, "ขับเคลื่อน 4 ล้อ เหมาะสำหรับครอบครัว"],
      ["atto3", "ฆค 5123", "BYD", "Atto 3", "EV", "BKK", 1990, 5000, "น้ำเงิน", "ไฟฟ้า", 5, 12760, "แบตเตอรี่ 480 กม./ชาร์จ แถมสายชาร์จ"],
      ["hrv-bkk", "3กร 1906", "Honda", "HR-V e:HEV EL", "SUV", "BKK", 1890, 5000, "ดำ", "Hybrid", 5, 21400, "ฝาท้ายไฟฟ้า Hands-free"],
      ["almera", "8กฉ 2210", "Nissan", "Almera VL Turbo", "Eco Car", "DMK", 1150, 3000, "แดง", "เบนซิน", 5, 19500, "กล้องรอบคัน 360 องศา"],
      ["altis-dmk", "7กว 1184", "Toyota", "Corolla Altis HEV", "Sedan", "DMK", 1390, 3000, "ขาว", "Hybrid", 5, 22300, "นุ่มนวล ประหยัดพลังงาน"],
      ["camry", "5กท 3399", "Toyota", "Camry HEV Premium", "Premium", "SLM", 2890, 8000, "ดำ", "Hybrid", 5, 15880, "เบาะปรับไฟฟ้าพร้อมระบบนวด"],
      ["hrv", "กจ 4410", "Honda", "HR-V e:HEV EL", "SUV", "CNX", 1890, 5000, "ดำ", "Hybrid", 5, 18900, "พร้อมลุยเส้นทางภาคเหนือ"],
      ["revo-cnx", "ขข 9032", "Toyota", "Hilux Revo Prerunner", "กระบะ", "CNX", 1790, 5000, "เทา", "ดีเซล", 5, 28400, "ยกสูง เกียร์อัตโนมัติ"],
      ["mg4", "ภก 3318", "MG", "MG4 Electric", "EV", "HKT", 1590, 5000, "เขียว", "ไฟฟ้า", 5, 14200, "ชาร์จไว DC 10-80% ใน 35 นาที"],
      ["veloz", "ชบ 5560", "Toyota", "Veloz Premium", "SUV 7 ที่นั่ง", "PTY", 1690, 5000, "แดง", "เบนซิน", 7, 16700, "เบาะพับอเนกประสงค์ 7 ที่นั่ง"],
      ["hilux", "ขก 2087", "Toyota", "Hilux Revo", "กระบะ", "KKC", 1790, 5000, "เทา", "ดีเซล", 5, 20800, "ช่วงล่าง Super Flex Suspension"]
    ].map(([id, plate, brand, model, type, branch, daily, deposit, color, fuel, seats, odometer, notes]) => ({
      id, plate, brand, model, type, branch, color, fuel, seats, year: 2024, odometer,
      status: "available", notes, pricing: { ...defaultPricing, daily, weekly: daily - 200, deposit }
    }));
    return {
      cars, bookings: [], invoices: [], messages: [], maintenance: [], sequence: 1, offset: 0,
      startedAt: Date.now(),
      users: [
        account("customer", "customer", "พิมพ์ใจ ทดสอบ", "", "081-234-5678"),
        account("staff.bkk", "staff", "นที สุวรรณภูมิ", "BKK", "089-111-2200"),
        account("staff.cnx", "staff", "วารี เชียงใหม่", "CNX", "089-333-4400"),
        account("admin", "admin", "ผู้ดูแล ChaosRoad", "", "02-134-5500")
      ]
    };
  }

  function seedRichDemo() {
    const state = seed();
    const baseTime = Date.parse("2026-11-10T09:00:00+07:00");
    // Add extra customers and branch staff for realism
    state.users.push(
      account("somchai.j", "customer", "สมชาย ใจดี", "", "086-555-7890"),
      account("emily.c", "customer", "Emily Carter", "", "092-441-9001"),
      account("staff.dmk", "staff", "กิตติ ดอนเมือง", "DMK", "089-222-3300"),
      account("staff.hkt", "staff", "อันดา ภูเก็ต", "HKT", "089-444-5500")
    );
    const sampleDoc = (name, label) => ({ key: "demo-" + name, name, size: 145200, syntheticLabel: label });

    // 1. Completed rental in early Nov (for history & revenue reports, uses Yaris so Honda City 2กข 4581 remains 100% free!)
    const bkDone = {
      id: "BK-0901", status: "completed", carId: "yaris", plate: "1ขก 7742",
      vehicle: "Toyota Yaris Ativ", owner: "customer", type: "Eco Car",
      pick: "BKK", drop: "BKK",
      start: Date.parse("2026-11-02T10:00:00+07:00"),
      end: Date.parse("2026-11-05T10:00:00+07:00"),
      createdAt: Date.parse("2026-11-01T09:00:00+07:00"),
      approvedAt: Date.parse("2026-11-01T09:40:00+07:00"),
      identity: sampleDoc("ID-PIMJAI.png", "DEMO ID CARD"),
      licence: sampleDoc("DL-PIMJAI.png", "DEMO DRIVING LICENCE"),
      quote: { days: 3, rate: 1090, base: 3270, promotion: "เช่า 3 วันขึ้นไป ลด 10% (CHAOS10)", discount: 327, oneWay: 0, total: 2943, deposit: 2943, lateRate: 200 },
      contract: {
        id: "CT-0901", lessor: "นที สุวรรณภูมิ", at: Date.parse("2026-11-01T14:00:00+07:00"),
        year: 2024, color: "เทา", type: "Eco Car",
        staff: { name: "นที สุวรรณภูมิ", at: Date.parse("2026-11-01T14:05:00+07:00") },
        customer: { name: "พิมพ์ใจ ทดสอบ", at: Date.parse("2026-11-01T15:10:00+07:00") }
      },
      pickup: { recordedAt: Date.parse("2026-11-02T10:00:00+07:00"), odometer: 23800, fuel: 100, notes: "ตัวถังและยางปกติ อุปกรณ์ครบ", photo: null },
      returned: {
        recordedAt: Date.parse("2026-11-05T10:15:00+07:00"), odometer: 24100, fuel: 100,
        notes: "คืนตรงเวลาภายในช่วงผ่อนผัน สภาพเรียบร้อย", photo: null, condition: "available",
        charges: { lateHours: 0, late: 0, fuel: 0, damage: 0, total: 0 }
      }
    };

    // 2. Pending booking request at BKK on Fortuner (for Staff Queue inspection demo)
    const bkPending = {
      id: "BK-0902", status: "pending", carId: "fortuner", plate: "4กพ 8800",
      vehicle: "Toyota Fortuner Legender", owner: "customer", type: "SUV 7 ที่นั่ง",
      pick: "BKK", drop: "CNX",
      start: Date.parse("2026-11-18T09:00:00+07:00"),
      end: Date.parse("2026-11-22T09:00:00+07:00"),
      createdAt: baseTime - 2 * hour,
      identity: sampleDoc("ID-SOMCHAI.png", "DEMO ID CARD"),
      licence: sampleDoc("DL-SOMCHAI.png", "DEMO DRIVING LICENCE"),
      quote: { days: 4, rate: 2590, base: 10360, promotion: "เช่า 3 วันขึ้นไป ลด 10% (CHAOS10)", discount: 1036, oneWay: 3500, total: 12824, deposit: 8000, lateRate: 200 }
    };

    // 3. Active Renting booking (BKK -> CNX) on BYD Atto 3 (ready to test return at CNX!)
    const bkRenting = {
      id: "BK-0903", status: "renting", carId: "atto3", plate: "ฆค 5123",
      vehicle: "BYD Atto 3", owner: "emily.c", type: "EV",
      pick: "BKK", drop: "CNX",
      start: Date.parse("2026-11-08T10:00:00+07:00"),
      end: Date.parse("2026-11-11T10:00:00+07:00"),
      createdAt: Date.parse("2026-11-06T11:00:00+07:00"),
      approvedAt: Date.parse("2026-11-06T11:30:00+07:00"),
      identity: sampleDoc("ID-EMILY.png", "DEMO ID CARD"),
      licence: sampleDoc("DL-EMILY.png", "DEMO DRIVING LICENCE"),
      quote: { days: 3, rate: 1990, base: 5970, promotion: "เช่า 3 วันขึ้นไป ลด 10% (CHAOS10)", discount: 597, oneWay: 3500, total: 8873, deposit: 5000, lateRate: 200 },
      contract: {
        id: "CT-0903", lessor: "นที สุวรรณภูมิ", at: Date.parse("2026-11-07T09:00:00+07:00"),
        year: 2024, color: "น้ำเงิน", type: "EV",
        staff: { name: "นที สุวรรณภูมิ", at: Date.parse("2026-11-07T09:05:00+07:00") },
        customer: { name: "Emily Carter", at: Date.parse("2026-11-07T10:00:00+07:00") }
      },
      pickup: { recordedAt: Date.parse("2026-11-08T10:00:00+07:00"), odometer: 12760, fuel: 100, notes: "ส่งมอบพร้อมสายชาร์จพกพา", photo: null }
    };
    const attoCar = state.cars.find(c => c.id === "atto3");
    if (attoCar) attoCar.status = "rented";

    state.bookings.push(bkDone, bkPending, bkRenting);
    state.invoices.push(
      { id: "INV-0901", bookingId: "BK-0901", kind: "deposit", amount: 2943, branch: "BKK", status: "paid", createdAt: Date.parse("2026-11-01T09:40:00+07:00"), paidAt: Date.parse("2026-11-01T10:15:00+07:00"), reference: "PP-0901", payerBank: "ธนาคารกสิกรไทย (KBank) ****2231" },
      { id: "INV-0902", bookingId: "BK-0903", kind: "deposit", amount: 5000, branch: "BKK", status: "paid", createdAt: Date.parse("2026-11-06T11:30:00+07:00"), paidAt: Date.parse("2026-11-06T12:10:00+07:00"), reference: "PP-0902", payerBank: "ธนาคารไทยพาณิชย์ (SCB) ****8840" },
      { id: "INV-0903", bookingId: "BK-0903", kind: "balance", amount: 3873, branch: "BKK", status: "paid", createdAt: Date.parse("2026-11-08T10:05:00+07:00"), paidAt: Date.parse("2026-11-08T10:12:00+07:00"), reference: "PP-0903", payerBank: "ธนาคารไทยพาณิชย์ (SCB) ****8840" }
    );
    state.messages.push(
      { bookingId: "BK-0901", to: "customer@example.test", status: "sent", at: Date.parse("2026-11-01T09:40:00+07:00"), name: "พิมพ์ใจ ทดสอบ", type: "Eco Car", start: bkDone.start, end: bkDone.end, pick: "BKK", drop: "BKK" },
      { bookingId: "BK-0903", to: "emily.c@example.test", status: "sent", at: Date.parse("2026-11-06T11:30:00+07:00"), name: "Emily Carter", type: "EV", start: bkRenting.start, end: bkRenting.end, pick: "BKK", drop: "CNX" }
    );
    state.maintenance.push(
      {
        id: "MT-0901", carId: "veloz", plate: "ชบ 5560", task: "เปลี่ยนน้ำมันเครื่องและไส้กรองตามระยะ",
        maintType: "เปลี่ยนน้ำมันเครื่อง + ไส้กรอง", branch: "PTY",
        start: Date.parse("2026-11-03T09:00:00+07:00"), end: Date.parse("2026-11-04T17:00:00+07:00"),
        trigger: "km", targetKm: 16500, frequency: "ทุก 10,000 กม.", garage: "ศูนย์บริการ Toyota พัทยา", advanceNotice: "1,000 กม. / 14 วัน",
        result: {
          summary: "เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์แท้ ตรวจเช็กระบบเบรกและแบตเตอรี่",
          parts: "น้ำมันเครื่องสังเคราะห์ 4 ลิตร, ไส้กรองน้ำมันเครื่อง, แหวนรองน็อต",
          garage: "ศูนย์บริการ Toyota พัทยา",
          serviceStart: "2026-11-03", serviceEnd: "2026-11-04",
          cost: 3450, odometer: 16700, at: Date.parse("2026-11-04T16:30:00+07:00"), status: "available"
        }
      },
      {
        id: "MT-0902", carId: "hilux", plate: "ขก 2087", task: "เช็กระยะ 25,000 กม. และตั้งศูนย์ถ่วงล้อ",
        maintType: "เช็กระยะตามคู่มือ", branch: "KKC",
        start: Date.parse("2026-11-24T09:00:00+07:00"), end: Date.parse("2026-11-25T17:00:00+07:00"),
        trigger: "km", targetKm: 25000, frequency: "ทุก 10,000 กม.", garage: "ศูนย์ Toyota ขอนแก่น", advanceNotice: "1,000 กม. / 14 วัน"
      }
    );
    return state;
  }

  function read() {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : save(seed());
  }

  function save(state) {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return state;
  }

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  function now(state) {
    return Date.parse("2026-11-10T09:00:00+07:00") + (Date.now() - state.startedAt) + state.offset;
  }

  function time(value) {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return NaN;
    return Date.parse(value + ":00+07:00");
  }

  function nextId(state, prefix) {
    return prefix + "-" + String(state.sequence++).padStart(4, "0");
  }

  function number(value, label, min = 0, max = 10000000) {
    const result = Number(value);
    check(String(value ?? "").trim() && Number.isInteger(result) && result >= min && result <= max,
      "กรอก " + label + " เป็นจำนวนเต็มระหว่าง " + min + " ถึง " + max);
    return result;
  }

  function text(value, label, max = 200) {
    const result = String(value ?? "").trim();
    check(result && result.length <= max, "กรอก " + label + " (ไม่เกิน " + max + " ตัวอักษร)");
    return result;
  }

  function user(state, username, role) {
    const match = state.users.find(item => item.username === username);
    check(match && (!role || role === match.role), "กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์");
    return match;
  }

  function getVehicle(state, id) {
    const car = state.cars.find(item => item.id === id);
    check(car, "ไม่พบรถคันนี้ในระบบ");
    return car;
  }

  function getBooking(state, actor, id, scope) {
    const booking = state.bookings.find(item => item.id === id);
    check(booking, "ไม่พบการจอง");
    if (scope === "customer") {
      check(actor.role === "customer" && booking.owner === actor.username, "การจองนี้เป็นของลูกค้ารายอื่น");
    } else {
      check(actor.role === "staff" && actor.branch === booking[scope], "การจองอยู่นอกสาขาที่รับผิดชอบ");
    }
    return booking;
  }

  function parseTrip(input) {
    check(Object.hasOwn(branches, input.pick) && Object.hasOwn(branches, input.drop), "เลือกสาขารับและคืนรถ");
    check(input.type === "all" || types.includes(input.type), "เลือกประเภทรถ");
    const start = time(input.start);
    const end = time(input.end);
    check(Number.isFinite(start) && end > start, "วันเวลาคืนต้องอยู่หลังวันเวลารับรถ");
    return { pick: input.pick, drop: input.drop, start, end, type: input.type };
  }

  function available(state, car, trip, excludedId) {
    if (car.status !== "available" || (trip.type !== "all" && car.type !== trip.type)) return false;
    const commitments = state.bookings.filter(item =>
      item.carId === car.id && item.id !== excludedId && ["pending", "approved"].includes(item.status)
    ).sort((first, second) => first.start - second.start);
    if (commitments.some(item => item.start < trip.end && trip.start < item.end)) return false;
    const previous = commitments.findLast(item => item.end <= trip.start);
    const next = commitments.find(item => item.start >= trip.end);
    if ((previous?.drop ?? car.branch) !== trip.pick || (next && next.pick !== trip.drop)) return false;
    return !state.maintenance.some(item => item.carId === car.id && !item.result &&
      item.start < trip.end && trip.start < item.end);
  }

  function quote(car, trip) {
    const days = Math.ceil((trip.end - trip.start) / day);
    const pricing = car.pricing;
    const rate = days >= 7 ? pricing.weekly : pricing.daily;
    const base = rate * days;
    const [promotion, percent, minDays] = promotions[pricing.promo] || promotions.none;
    const discount = days >= minDays ? Math.round(base * percent / 100) : 0;
    const oneWay = trip.pick === trip.drop ? 0 :
      (branches[trip.pick][1] === branches[trip.drop][1] ? pricing.regional : pricing.interregional);
    const total = base - discount + oneWay;
    return { days, rate, base, promotion, discount, oneWay, total, deposit: Math.min(pricing.deposit, total), lateRate: pricing.late };
  }

  function invoice(state, booking, kind, amount) {
    const existing = state.invoices.find(item => item.bookingId === booking.id && item.kind === kind);
    if (existing) return existing;
    if (!amount) return null;
    const item = {
      id: nextId(state, "INV"), bookingId: booking.id, kind, amount,
      branch: kind === "extra" ? booking.drop : booking.pick, status: "unpaid", createdAt: now(state)
    };
    state.invoices.push(item);
    return item;
  }

  function depositInvoice(state, booking) {
    return state.invoices.find(item => item.bookingId === booking.id && item.kind === "deposit");
  }

  function hasDeposit(state, booking) {
    return booking.quote.deposit === 0 || depositInvoice(state, booking)?.status === "paid";
  }

  function cancel(state, booking, reason) {
    booking.status = "cancelled";
    booking.reason = reason;
    for (const item of state.invoices.filter(item => item.bookingId === booking.id && item.status === "unpaid")) {
      item.status = "void";
    }
  }

  function expireDeposits(state) {
    let changed = false;
    for (const booking of state.bookings) {
      if (booking.status === "approved" && booking.approvedAt + day <= now(state) && !hasDeposit(state, booking)) {
        cancel(state, booking, "ไม่ได้ชำระค่ามัดจำภายใน 24 ชั่วโมง");
        changed = true;
      }
    }
    return changed;
  }

  function snapshot() {
    const state = read();
    if (expireDeposits(state)) save(state);
    return state;
  }

  function saveAccount(state, input, role, existing) {
    const username = text(input.username, "Username", 30).toLowerCase();
    check(/^[a-z0-9._-]{3,30}$/.test(username), "Username ใช้ a–z, 0–9, จุด, ขีดกลาง หรือขีดล่าง 3–30 ตัว");
    check(!state.users.some(item => item !== existing && item.username === username), "Username นี้ถูกใช้งานแล้ว");
    const email = text(input.email, "อีเมล", 100);
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "ตรวจสอบรูปแบบอีเมล");
    const phone = text(input.phone, "เบอร์โทรศัพท์", 20);
    check(/^\+?[\d -]{8,19}$/.test(phone), "ตรวจสอบเบอร์โทรศัพท์");
    const password = input.password || !existing ? text(input.password, "รหัสผ่านทดลอง", 64) : existing.password;
    check(password.length >= 8, "รหัสผ่านทดลองต้องมีอย่างน้อย 8 ตัวอักษร");
    const branch = role === "staff" ? input.branch : "";
    check(role !== "staff" || Object.hasOwn(branches, branch), "เลือกสาขาที่ถูกต้อง");
    const record = { username, name: text(input.name, "ชื่อ-นามสกุล"), email, phone, password, branch, role };
    if (existing) return Object.assign(existing, record);
    state.users.push(record);
    return record;
  }

  function inspection(input, minimum) {
    const recordedAt = time(input.recordedAt);
    check(Number.isFinite(recordedAt), "ระบุวันเวลาเกิดเหตุการณ์จริง");
    return {
      recordedAt, odometer: number(input.odometer, "เลขไมล์", minimum),
      fuel: number(input.fuel, "ระดับน้ำมัน", 0, 100),
      notes: String(input.notes || "").trim().slice(0, 300), photo: input.photo || null
    };
  }

  function returnCharges(booking, input) {
    const excess = time(input.recordedAt) - booking.end - 30 * 60000;
    const lateHours = Math.max(0, Math.ceil(excess / hour));
    const late = Math.min(lateHours * booking.quote.lateRate, booking.quote.rate);
    const fuel = Number(input.fuelFee || 0);
    const damage = Number(input.damageFee || 0);
    return { lateHours, late, fuel, damage, total: late + fuel + damage };
  }

  const commands = {
    request(state, actor, input) {
      check(actor.role === "customer", "ใช้บัญชีลูกค้าเพื่อส่งคำขอ");
      const car = getVehicle(state, input.carId);
      const trip = parseTrip(input);
      check(trip.start > now(state), "เลือกรับรถหลังเวลาจำลองปัจจุบัน");
      check(available(state, car, trip), "รถไม่ว่างสำหรับช่วงเวลาและสาขาที่เลือก กรุณาค้นหาใหม่");
      check(input.identity?.key && input.licence?.key, "แนบสำเนาบัตรประชาชนและใบขับขี่ให้ครบ");
      const booking = {
        ...trip, type: car.type, id: nextId(state, "BK"), status: "pending", carId: car.id, plate: car.plate,
        vehicle: car.brand + " " + car.model, owner: actor.username, createdAt: now(state),
        identity: input.identity, licence: input.licence, quote: quote(car, trip)
      };
      state.bookings.push(booking);
      return booking;
    },
    review(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "pick");
      check(booking.status === "pending", "คำขอนี้ได้รับการพิจารณาแล้ว");
      if (input.outcome === "reject") {
        booking.reason = text(input.reason, "เหตุผลการปฏิเสธ");
        booking.status = "rejected";
        return booking;
      }
      check(input.outcome === "approve" && input.verified, "ยืนยันว่าตรวจเอกสารทั้งสองรายการแล้ว");
      check(booking.start > now(state), "วันรับรถผ่านไปแล้ว");
      check(available(state, getVehicle(state, booking.carId), booking, booking.id), "รถไม่พร้อมสำหรับช่วงที่ขอจอง");
      booking.status = "approved";
      booking.approvedAt = now(state);
      const customer = user(state, booking.owner, "customer");
      state.messages.push({
        bookingId: booking.id, to: customer.email, status: "sent", at: now(state),
        name: customer.name, type: booking.type, start: booking.start, end: booking.end,
        pick: booking.pick, drop: booking.drop
      });
      invoice(state, booking, "deposit", booking.quote.deposit);
      return booking;
    },
    change(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "customer");
      check(["pending", "approved"].includes(booking.status), "เปลี่ยนแปลงได้เฉพาะก่อนรับรถ");
      const car = getVehicle(state, booking.carId);
      const end = time(input.end);
      check(end > booking.start && Object.hasOwn(branches, input.drop), "ตรวจสอบสาขาและวันเวลาคืนรถ");
      const changed = { ...booking, end, drop: input.drop };
      if (end === booking.end && input.drop === booking.drop) return booking;
      check(available(state, car, changed, booking.id), "ช่วงเวลาหรือเส้นทางใหม่ขัดกับการจองหรือการซ่อมบำรุง");
      const updated = quote(car, changed);
      const existing = depositInvoice(state, booking);
      if (existing?.status === "paid") {
        check(updated.total >= existing.amount, "ยอดใหม่ต่ำกว่ามัดจำที่จ่ายแล้ว กรุณาเลือกช่วงเวลาอื่น");
        updated.deposit = existing.amount;
      }
      if (existing?.status === "unpaid") {
        existing.amount = updated.deposit;
        if (!existing.amount) existing.status = "void";
      }
      booking.difference = updated.total - booking.quote.total;
      Object.assign(booking, { end, drop: input.drop, quote: updated });
      delete booking.contract;
      if (booking.status === "approved" && updated.deposit > 0 && existing?.status !== "paid") {
        const current = invoice(state, booking, "deposit", updated.deposit);
        Object.assign(current, { amount: updated.deposit, status: "unpaid" });
      }
      return booking;
    },
    cancel(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "customer");
      check(["pending", "approved"].includes(booking.status), "ยกเลิกได้เฉพาะก่อนรับรถ");
      cancel(state, booking, text(input.reason, "เหตุผลการยกเลิก"));
      return booking;
    },
    pay(state, actor, input) {
      const item = state.invoices.find(record => record.id === input.invoiceId);
      check(item, "ไม่พบใบแจ้งหนี้");
      getBooking(state, actor, item.bookingId, "customer");
      check(item.status === "unpaid", "ใบแจ้งหนี้นี้ไม่เปิดรับชำระ");
      check(["failed", "paid"].includes(input.outcome), "ผลชำระเงินไม่ถูกต้อง");
      if (input.outcome === "failed") {
        item.lastFailure = now(state);
        return item;
      }
      item.status = "paid";
      item.paidAt = now(state);
      item.reference = "PP-" + item.id.slice(4);
      item.payerBank = String(input.payerBank || "ธนาคารกสิกรไทย (KBank) ****2231").trim();
      return item;
    },
    contract(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "pick");
      check(booking.status === "approved" && hasDeposit(state, booking), "ต้องอนุมัติและชำระมัดจำก่อนสร้างสัญญา");
      if (!booking.contract) {
        const car = getVehicle(state, booking.carId);
        booking.contract = {
          id: nextId(state, "CT"), lessor: actor.name, at: now(state),
          year: car.year, color: car.color, type: booking.type
        };
      }
      return booking;
    },
    sign(state, actor, input) {
      const scope = actor.role === "staff" ? "pick" : "customer";
      const booking = getBooking(state, actor, input.id, scope);
      check(booking.status === "approved" && booking.contract && hasDeposit(state, booking), "ยังไม่สามารถเซ็นสัญญาได้");
      check(!booking.contract[actor.role], "ฝ่ายนี้ลงนามแล้ว");
      booking.contract[actor.role] = {
        name: text(input.signature, "ชื่อสำหรับลงนาม"),
        at: now(state),
        drawn: input.drawnSig || null
      };
      return booking;
    },
    handover(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "pick");
      check(booking.status === "approved" && hasDeposit(state, booking) &&
        booking.contract?.staff && booking.contract?.customer, "ต้องชำระมัดจำและลงนามครบทั้งสองฝ่าย");
      const car = getVehicle(state, booking.carId);
      check(car.status === "available" && car.branch === booking.pick, "รถยังไม่พร้อมส่งมอบที่สาขารับรถ");
      booking.pickup = inspection(input, car.odometer);
      booking.status = "renting";
      car.status = "rented";
      car.odometer = booking.pickup.odometer;
      if (input.issue) commands.issueBalance(state, actor, input);
      return booking;
    },
    issueBalance(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "pick");
      check(booking.pickup, "บันทึกการส่งมอบก่อนออกใบแจ้งหนี้ค่าเช่า");
      return invoice(state, booking, "balance", Math.max(0, booking.quote.total - (depositInvoice(state, booking)?.amount || 0)));
    },
    returnCar(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "drop");
      check(booking.status === "renting", "รถยังไม่ได้ส่งมอบหรือรับคืนแล้ว");
      const car = getVehicle(state, booking.carId);
      const result = inspection(input, booking.pickup.odometer);
      check(result.recordedAt >= booking.pickup.recordedAt, "เวลารับคืนต้องอยู่หลังเวลาส่งมอบ");
      check(["available", "maintenance"].includes(input.condition), "เลือกระบุผลตรวจสภาพรถ");
      number(input.fuelFee, "ค่าน้ำมันขาด");
      number(input.damageFee, "ค่าความเสียหาย");
      booking.returned = { ...result, condition: input.condition, charges: returnCharges(booking, input) };
      booking.status = "completed";
      Object.assign(car, { status: input.condition, branch: booking.drop, odometer: result.odometer });
      if (input.issue) commands.issueReturn(state, actor, input);
      return booking;
    },
    issueReturn(state, actor, input) {
      const booking = getBooking(state, actor, input.id, "drop");
      check(booking.returned, "บันทึกการรับคืนก่อนออกใบแจ้งหนี้");
      return invoice(state, booking, "extra", booking.returned.charges.total);
    },
    staff(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      check(["staff", "admin"].includes(input.role), "เลือกบทบาทของพนักงาน");
      const existing = input.existing ? user(state, input.existing) : null;
      check(!existing || existing.role !== "customer", "บัญชีนี้เป็นของลูกค้า");
      check(existing !== actor || (input.role === "admin" && input.username === actor.username),
        "บัญชีที่กำลังใช้งานต้องคง Username และบทบาทผู้ดูแลระบบ");
      return saveAccount(state, input, input.role, existing);
    },
    removeStaff(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      const existing = user(state, input.existing);
      check(existing.role !== "customer" && existing !== actor, "เลือกบัญชีพนักงานอื่นที่ต้องการลบ");
      state.users = state.users.filter(item => item !== existing);
    },
    vehicle(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      const existing = input.id ? getVehicle(state, input.id) : null;
      const plate = text(input.plate, "ทะเบียน", 40);
      check(!state.cars.some(item => item.id !== input.id && item.plate === plate), "มีทะเบียนนี้ในระบบแล้ว");
      check(types.includes(input.type) && Object.hasOwn(branches, input.branch), "เลือกประเภทรถและสาขา");
      check(["available", "rented", "maintenance", "inactive"].includes(input.status), "เลือกสถานะรถ");
      if (existing?.status === "rented") {
        check(input.status === "rented" && input.branch === existing.branch && plate === existing.plate,
          "รถที่กำลังเช่าเปลี่ยนสถานะ สาขา หรือทะเบียนได้เมื่อรับคืนแล้ว");
      } else {
        check(input.status !== "rented", "สถานะกำลังเช่ามาจากการส่งมอบรถ");
      }
      const fields = {
        plate, brand: text(input.brand, "ยี่ห้อ"), model: text(input.model, "รุ่น"),
        color: text(input.color, "สี"), fuel: text(input.fuel, "เชื้อเพลิง"),
        year: number(input.year, "ปี", 1950, 2100), seats: number(input.seats, "ที่นั่ง", 1, 30),
        odometer: number(input.odometer, "เลขไมล์"), type: input.type, branch: input.branch,
        status: input.status, notes: String(input.notes || "").trim().slice(0, 300)
      };
      if (existing) return Object.assign(existing, fields);
      const car = { id: nextId(state, "CAR"), ...fields, pricing: { ...defaultPricing } };
      state.cars.push(car);
      return car;
    },
    removeVehicle(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      getVehicle(state, input.id);
      check(!state.bookings.some(item => item.carId === input.id && ["pending", "approved", "renting"].includes(item.status)),
        "รถมีรายการจองหรือเช่าที่กำลังดำเนินการ");
      check(!state.maintenance.some(item => item.carId === input.id && !item.result), "รถมีแผนบำรุงรักษาที่ยังเปิดอยู่");
      state.cars = state.cars.filter(item => item.id !== input.id);
    },
    pricing(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      const car = getVehicle(state, input.id);
      check(Object.hasOwn(promotions, input.promo), "เลือกโปรโมชัน");
      car.pricing = {
        daily: number(input.daily, "อัตราค่าเช่า", 1), weekly: number(input.weekly, "อัตรา 7 วันขึ้นไป", 1),
        deposit: number(input.deposit, "มัดจำ"), regional: number(input.regional, "ค่าคืนในภูมิภาค"),
        interregional: number(input.interregional, "ค่าคืนข้ามภูมิภาค"), late: number(input.late, "ค่าคืนช้าต่อชั่วโมง"),
        promo: input.promo
      };
      return car;
    },
    plan(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      const car = getVehicle(state, input.carId);
      const start = time(input.start);
      const end = time(input.end);
      check(Number.isFinite(start) && end > start, "วันสิ้นสุดแผนต้องอยู่หลังวันเริ่มต้น");
      check(!state.bookings.some(item => item.carId === car.id &&
        ["pending", "approved", "renting"].includes(item.status) && item.start < end && start < item.end),
      "แผนซ้อนกับช่วงการจองหรือเช่า");
      const plan = {
        id: nextId(state, "MT"), carId: car.id, plate: car.plate,
        task: text(input.task, "งานบำรุงรักษา"),
        maintType: String(input.maintType || "เช็กระยะตามคู่มือ").trim(),
        branch: car.branch, start, end,
        trigger: input.trigger === "km" ? "km" : "date",
        targetKm: input.trigger === "km" ? number(input.targetKm, "เลขไมล์เป้าหมาย", car.odometer) : null,
        frequency: String(input.frequency || "ทุก 10,000 กม. / 6 เดือน").trim(),
        garage: String(input.garage || "ศูนย์บริการมาตรฐานประจำสาขา").trim(),
        advanceNotice: String(input.advanceNotice || "1,000 กม. / 14 วัน").trim()
      };
      state.maintenance.push(plan);
      return plan;
    },
    maintenance(state, actor, input) {
      check(actor.role === "admin", "เฉพาะผู้ดูแลระบบ");
      const plan = state.maintenance.find(item => item.id === input.id);
      check(plan && !plan.result, "ไม่พบแผนบำรุงรักษาที่เปิดอยู่");
      const car = getVehicle(state, plan.carId);
      check(car.status !== "rented", "บันทึกผลเมื่อรับคืนรถแล้ว");
      check(["available", "maintenance", "inactive"].includes(input.status), "เลือกสถานะหลังบำรุงรักษา");
      plan.result = {
        summary: text(input.result, "ผลบำรุงรักษา"),
        parts: String(input.parts || "ตามรายการมาตรฐานศูนย์บริการ").trim(),
        garage: String(input.garage || plan.garage || "ศูนย์บริการมาตรฐานประจำสาขา").trim(),
        serviceStart: String(input.serviceStart || "2026-11-10").trim(),
        serviceEnd: String(input.serviceEnd || "2026-11-10").trim(),
        cost: number(input.cost, "ค่าใช้จ่าย"),
        odometer: number(input.odometer, "เลขไมล์", car.odometer),
        at: now(state), status: input.status
      };
      Object.assign(car, { status: input.status, odometer: plan.result.odometer });
      return plan;
    }
  };

  function run(command, username, input) {
    const state = snapshot();
    check(Object.hasOwn(commands, command), "ไม่พบคำสั่ง");
    const result = commands[command](state, user(state, username), input);
    save(state);
    return result;
  }

  function authenticate(input) {
    const actor = snapshot().users.find(item => item.role === input.role &&
      item.username === String(input.username).trim().toLowerCase() && item.password === input.password);
    check(actor, "Username หรือรหัสผ่านไม่ถูกต้องสำหรับบทบาทนี้");
    return actor;
  }

  function advance() {
    const state = snapshot();
    state.offset += day;
    expireDeposits(state);
    save(state);
  }

  return {
    branches, types, promotions, defaultPricing, demoPassword, hour, day, now, time, quote,
    parseTrip, available, returnCharges, hasDeposit, getVehicle, snapshot, run, authenticate, advance,
    register(input) { const state = snapshot(); const result = saveAccount(state, input, "customer"); save(state); return result; },
    reset() { save(seed()); },
    loadRichDemo() { save(seedRichDemo()); }
  };
})();
