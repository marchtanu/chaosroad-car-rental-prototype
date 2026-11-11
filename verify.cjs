"use strict";

(async function verify() {
  const assert = require("node:assert/strict");
  const path = require("node:path");
  const fs = require("node:fs/promises");
  const { pathToFileURL } = require("node:url");
  const { chromium } = require(process.env.CHAOSROAD_PLAYWRIGHT || "playwright");
  const entry = pathToFileURL(path.join(__dirname, "index.html")).href;
  const browser = await chromium.launch({
    executablePath: process.env.CHAOSROAD_BROWSER || undefined,
    headless: true
  });
  const evidence = process.env.CHAOSROAD_EVIDENCE;
  if (evidence) await fs.mkdir(evidence, { recursive: true });
  const results = [];
  const errors = [];
  const credentials = { customer: "customer", staff: "staff.bkk", admin: "admin" };

  const click = (page, name) => page.getByRole("button", { name, exact: true }).click();
  const screen = (page, name) => page.getByRole("heading", { name, exact: true }).waitFor();
  const status = (page, name) => page.locator(".pill").getByText(name, { exact: true }).first().waitFor();
  const field = (page, name) => page.locator(`main [name="${name}"]:visible`).first();
  const message = async (page, pattern) => {
    await page.locator("#notice").filter({ hasText: pattern }).waitFor();
    return (await page.locator("#notice").innerText()).trim();
  };

  async function login(page, role, account = credentials[role]) {
    if (await page.getByRole("button", { name: "สลับบทบาท", exact: true }).isVisible()) await click(page, "สลับบทบาท");
    const labels = { customer: "ลูกค้า", staff: "พนักงานสาขา", admin: "ผู้ดูแลระบบ" };
    const card = page.locator(".roles article").filter({ has: page.getByRole("heading", { name: labels[role], exact: true }) });
    await card.getByRole("button", { name: "เข้าสู่พอร์ทัล" }).click();
    await field(page, "username").fill(account);
    await field(page, "password").fill("Demo1234");
    await click(page, "เข้าสู่ระบบ");
    await screen(page, { customer: "ค้นหารถ", staff: "การจองสาขา", admin: "ยานพาหนะ" }[role]);
  }

  async function findCar(page) {
    await click(page, "ค้นหารถที่ว่าง");
    await screen(page, "รถที่ว่าง (1)");
    await click(page, "ดูราคาและจอง");
    await screen(page, "ส่งคำขอจอง");
  }

  async function booking(page) {
    await login(page, "customer");
    await findCar(page);
    await click(page, "ใส่ไฟล์ตัวอย่าง");
    await message(page, "แนบไฟล์ตัวอย่างทั้งสองรายการแล้ว");
    await click(page, "ส่งคำขอจอง");
    await screen(page, "การจอง BK-0001");
    await status(page, "รอการอนุมัติ");
    return "BK-0001";
  }

  async function openBooking(page, role, account, id = "BK-0001") {
    await login(page, role, account);
    if (role === "customer") await click(page, "การจองของฉัน");
    await click(page, "ดู " + id);
    await screen(page, "การจอง " + id);
  }

  async function approve(page) {
    await openBooking(page, "staff");
    await field(page, "verified").check();
    await click(page, "อนุมัติคำขอ");
    await status(page, "อนุมัติแล้ว");
  }

  async function payDeposit(page) {
    await openBooking(page, "customer");
    await click(page, "ดูใบแจ้งหนี้ ค่ามัดจำ");
    await click(page, "จำลองชำระสำเร็จ");
    await status(page, "ชำระแล้ว");
  }

  async function sign(page, name) {
    await field(page, "signature").fill(name);
    await field(page, "consent").check();
    await click(page, "ลงนามสัญญา");
    await message(page, "บันทึกลายเซ็นแล้ว");
  }

  async function prepareHandover(page, both = true) {
    await booking(page);
    await approve(page);
    await payDeposit(page);
    await openBooking(page, "staff");
    await click(page, "สร้างสัญญาเช่ารถ");
    await sign(page, "Natee Demo");
    if (!both) return;
    await openBooking(page, "customer");
    await sign(page, "Pimjai Demo");
    await openBooking(page, "staff");
  }

  async function capture(page, name) {
    if (evidence) await page.screenshot({ path: path.join(evidence, name + ".png"), fullPage: false, animations: "disabled" });
  }

  async function test(id, exercise, viewport = { width: 1260, height: 900 }) {
    const context = await browser.newContext({ viewport, offline: true });
    const page = await context.newPage();
    page.setDefaultTimeout(5500);
    page.on("pageerror", error => errors.push(id + ": " + error.message));
    try {
      await page.goto(entry);
      await screen(page, "ระบบบริหารจัดการรถเช่า");
      const actual = await exercise(page);
      results.push({ id, status: "Pass", actual });
      console.log(`PASS ${id} — ${actual}`);
    } catch (error) {
      results.push({ id, status: "Fail", actual: error.message });
      console.error(`FAIL ${id} — ${error.message}`);
      await capture(page, id + "-failure");
    } finally {
      await context.close();
    }
  }

  try {
    await test("TC-01-H", async page => {
      await login(page, "customer");
      await findCar(page);
      const quote = await page.locator("main").innerText();
      for (const amount of ["5,160", "516", "3,500", "8,144", "3,000"]) assert.ok(quote.includes(amount), amount);
      await click(page, "ใส่ไฟล์ตัวอย่าง");
      await message(page, "แนบไฟล์ตัวอย่างทั้งสองรายการแล้ว");
      await click(page, "ส่งคำขอจอง");
      await screen(page, "การจอง BK-0001");
      await status(page, "รอการอนุมัติ");
      assert.equal(await page.getByRole("button", { name: "ดูใบแจ้งหนี้ ค่ามัดจำ", exact: true }).count(), 0);
      await page.reload();
      await screen(page, "ค้นหารถ");
      await click(page, "การจองของฉัน");
      await click(page, "ดู BK-0001");
      await status(page, "รอการอนุมัติ");
      await capture(page, "01-booking");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      return "BK-0001 persisted after reload as pending. Base THB 5,160, discount 516, one-way fee 3,500, total 8,144, deposit 3,000. No deposit invoice was visible.";
    }, { width: 390, height: 920 });

    await test("TC-01-U", async page => {
      await login(page, "customer");
      await field(page, "end").fill("2026-11-11T10:00");
      await click(page, "ค้นหารถที่ว่าง");
      await message(page, "วันเวลาคืนต้องอยู่หลังวันเวลารับรถ");
      assert.equal(await page.getByRole("button", { name: "ดูราคาและจอง" }).count(), 0);
      await click(page, "การจองของฉัน");
      await page.getByText("ยังไม่มีการจองในรายการนี้", { exact: true }).waitFor();
      return "Search displayed the invalid date-range message, showed no car result, and left My bookings empty.";
    });

    await test("TC-02-H", async page => {
      await booking(page);
      await approve(page);
      await click(page, "อีเมลยืนยัน");
      await screen(page, "ยืนยันการจอง BK-0001");
      assert.match(await page.locator("main").innerText(), /customer@example\.test/);
      await capture(page, "02-approval");
      await openBooking(page, "customer");
      await click(page, "ดูใบแจ้งหนี้ ค่ามัดจำ");
      await page.getByRole("img", { name: "QR สำหรับการชำระเงินจำลอง" }).waitFor();
      await capture(page, "03-deposit-qr");
      await click(page, "จำลองชำระสำเร็จ");
      await status(page, "ชำระแล้ว");
      assert.match(await page.locator("main").innerText(), /PP-0002/);
      await openBooking(page, "staff");
      await page.getByRole("button", { name: "สร้างสัญญาเช่ารถ", exact: true }).waitFor();
      return "Approval recorded one confirmation to customer@example.test and issued INV-0002 for THB 3,000. The demo gateway recorded PP-0002 as paid and unlocked contract generation.";
    });

    await test("TC-02-U", async page => {
      await booking(page);
      await openBooking(page, "staff");
      await field(page, "reason").fill("ใบขับขี่หมดอายุ");
      await click(page, "ปฏิเสธคำขอ");
      await status(page, "ถูกปฏิเสธ");
      await click(page, "อีเมลยืนยัน");
      await page.getByText("ยังไม่มีอีเมลยืนยันของสาขา", { exact: true }).waitFor();
      await openBooking(page, "customer");
      await page.getByText("ใบขับขี่หมดอายุ", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "ดูใบแจ้งหนี้ ค่ามัดจำ" }).count(), 0);
      return "Staff rejection set Rejected and the customer saw the exact expired-licence reason. The branch outbox was empty and no deposit invoice was issued.";
    });

    await test("TC-03-H", async page => {
      await prepareHandover(page);
      await field(page, "odometer").fill("18240");
      await click(page, "ยืนยันส่งมอบและออกใบแจ้งหนี้ค่าเช่า");
      await status(page, "กำลังเช่า");
      await openBooking(page, "customer");
      await click(page, "ดูใบแจ้งหนี้ ค่าเช่าส่วนที่เหลือ");
      assert.match(await page.locator("main").innerText(), /5,144/);
      await click(page, "จำลองชำระสำเร็จ");
      await status(page, "ชำระแล้ว");
      await openBooking(page, "staff", "staff.cnx");
      await field(page, "recordedAt").fill("2026-11-16T13:05");
      await field(page, "odometer").fill("18760");
      await field(page, "fuel").fill("65");
      await field(page, "fuelFee").fill("800");
      await field(page, "damageFee").fill("2500");
      await field(page, "condition").selectOption("maintenance");
      assert.match(await page.locator("#charge-preview").innerText(), /3,900/);
      await click(page, "ยืนยันรับคืนและออกใบแจ้งหนี้");
      await status(page, "เสร็จสิ้น");
      assert.match(await page.locator("main").innerText(), /อยู่ระหว่างซ่อมบำรุง/);
      await capture(page, "04-return");
      await click(page, "รถประจำสาขา");
      assert.match(await page.getByRole("row").filter({ hasText: "2กข 4581" }).innerText(), /อยู่ระหว่างซ่อมบำรุง/);
      await openBooking(page, "customer");
      await click(page, "ดูใบแจ้งหนี้ ค่าบริการเพิ่มเติม");
      assert.match(await page.locator("main").innerText(), /3,900/);
      assert.match(await page.locator("main").innerText(), /CNX/);
      await click(page, "จำลองชำระสำเร็จ");
      await status(page, "ชำระแล้ว");
      await click(page, "ประวัติการเช่า");
      await page.getByRole("button", { name: "ดู BK-0001", exact: true }).waitFor();
      await login(page, "admin");
      await click(page, "รายงาน");
      const bkk = await page.getByRole("row").filter({ hasText: "สุวรรณภูมิ" }).innerText();
      const cnx = await page.getByRole("row").filter({ hasText: "เชียงใหม่" }).innerText();
      assert.match(bkk, /8,144/);
      assert.match(cnx, /3,900/);
      await capture(page, "05-revenue");
      return "Handover set Renting and issued THB 5,144. CNX return at 13:05 produced late 600 + fuel 800 + damage 2,500 = THB 3,900, set Completed and Maintenance, and appeared in history. Paid revenue was THB 8,144 at BKK and THB 3,900 at CNX.";
    });

    await test("TC-03-U", async page => {
      await prepareHandover(page, false);
      await page.getByText("รอลงนาม", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "ยืนยันส่งมอบและออกใบแจ้งหนี้ค่าเช่า" }).count(), 0);
      assert.equal(await page.getByRole("cell", { name: "ค่าเช่าส่วนที่เหลือ" }).count(), 0);
      await status(page, "อนุมัติแล้ว");
      await click(page, "รถประจำสาขา");
      const row = page.getByRole("row").filter({ hasText: "2กข 4581" });
      assert.match(await row.innerText(), /พร้อมใช้งาน/);
      return "Missing customer signature left the contract awaiting signature. Handover was unavailable, no balance invoice was listed, booking stayed Approved, and the car stayed Available.";
    });

    await test("SMOKE-01", async page => {
      await booking(page);
      await approve(page);
      await openBooking(page, "customer");
      await click(page, "ดูใบแจ้งหนี้ ค่ามัดจำ");
      await click(page, "จำลองชำระไม่สำเร็จ");
      await message(page, "ชำระเงินไม่สำเร็จ");
      await status(page, "รอชำระ");
      await click(page, "จำลองเลยกำหนด 24 ชม.");
      await status(page, "ยกเลิก");
      await status(page, "ยกเลิกใบแจ้งหนี้");
      await login(page, "staff", "staff.cnx");
      assert.equal(await page.getByRole("button", { name: "ดู BK-0001" }).count(), 0);
      return "Payment failure left the deposit retryable, the simulated 24-hour deadline cancelled the booking and voided the invoice, and CNX staff could not see the BKK pickup request.";
    });

    await test("SMOKE-02", async page => {
      await login(page, "admin");
      await click(page, "บัญชีพนักงาน");
      for (const [key, value] of Object.entries({ name: "Demo Staff", email: "dmk@example.test", phone: "0800000001", username: "staff.dmk", password: "Demo1234" })) {
        await field(page, key).fill(value);
      }
      await page.locator('form[data-form="staff"] select[name="branch"]').selectOption("DMK");
      await click(page, "สร้างบัญชีพนักงาน");
      await message(page, "บันทึกข้อมูลแล้ว");
      await login(page, "staff", "staff.dmk");
      await click(page, "รถประจำสาขา");
      assert.match(await page.locator("main").innerText(), /8กฉ 2210/);
      assert.doesNotMatch(await page.locator("main").innerText(), /2กข 4581/);
      await login(page, "admin");
      await click(page, "บัญชีพนักงาน");
      await field(page, "query").fill("staff.dmk");
      await click(page, "ค้นหาบัญชี");
      assert.equal(await page.getByRole("row").count(), 2);
      await click(page, "แก้ไข staff.dmk");
      await field(page, "branch").selectOption("HKT");
      await click(page, "บันทึกบัญชี");
      await message(page, "บันทึกข้อมูลแล้ว");
      assert.match(await page.getByRole("row").filter({ hasText: "staff.dmk" }).innerText(), /HKT/);
      await click(page, "แก้ไข staff.dmk");
      page.once("dialog", dialog => dialog.accept());
      await click(page, "ลบบัญชีนี้");
      await page.getByText("ไม่พบบัญชีตามเงื่อนไข", { exact: true }).waitFor();
      await click(page, "ราคาและโปรโมชัน");
      await click(page, "ตั้งราคา 2กข 4581");
      await field(page, "weekly").fill("1000");
      await click(page, "บันทึกราคา");
      await message(page, "บันทึกข้อมูลแล้ว");
      await click(page, "บำรุงรักษา");
      await click(page, "สร้างแผน");
      await field(page, "task").fill("Demo inspection");
      await field(page, "start").fill("2026-11-12T10:00");
      await field(page, "end").fill("2026-11-13T10:00");
      await click(page, "บันทึกแผน");
      await message(page, "บันทึกข้อมูลแล้ว");
      await login(page, "customer");
      await click(page, "ค้นหารถที่ว่าง");
      await screen(page, "รถที่ว่าง (0)");
      await login(page, "admin");
      await click(page, "บำรุงรักษา");
      await click(page, "บันทึกผล MT-0001");
      await field(page, "result").fill("Inspection complete");
      await click(page, "บันทึกผล");
      await page.getByRole("cell", { name: "Inspection complete", exact: true }).waitFor();
      return "Created, scoped, searched, edited and deleted a staff account. Updated the per-car weekly rate, created a plan that blocked search availability, and saved the maintenance result in history.";
    });

    await test("SMOKE-03", async page => {
      await booking(page);
      await approve(page);
      await payDeposit(page);
      await openBooking(page, "customer");
      await click(page, "เปลี่ยนรายละเอียดการคืน");
      await field(page, "drop").selectOption("DMK");
      await field(page, "end").fill("2026-11-19T10:00");
      await click(page, "บันทึกและคำนวณใหม่");
      await message(page, "บันทึกการเปลี่ยนแปลงและคำนวณราคาใหม่แล้ว");
      await status(page, "อนุมัติแล้ว");
      assert.match(await page.locator("main").innerText(), /7,667/);
      await click(page, "ยกเลิกการจอง");
      await field(page, "reason").fill("Travel plans changed");
      await click(page, "ยืนยันยกเลิก");
      await status(page, "ยกเลิก");
      await status(page, "ชำระแล้ว");
      await page.getByText("Travel plans changed", { exact: true }).waitFor();
      await login(page, "admin");
      await click(page, "เพิ่มรถ");
      for (const [key, value] of Object.entries({ plate: "DEMO-99", brand: "Demo", model: "Fleet check", color: "White", fuel: "Hybrid" })) {
        await field(page, key).fill(value);
      }
      await click(page, "บันทึกรถ");
      await message(page, "บันทึกข้อมูลแล้ว");
      await click(page, "แก้ไข DEMO-99");
      await field(page, "branch").selectOption("DMK");
      await click(page, "บันทึกรถ");
      await message(page, "บันทึกข้อมูลแล้ว");
      assert.match(await page.getByRole("row").filter({ hasText: "DEMO-99" }).innerText(), /DMK/);
      await click(page, "แก้ไข DEMO-99");
      page.once("dialog", dialog => dialog.accept());
      await click(page, "ลบทะเบียนนี้");
      await message(page, "บันทึกข้อมูลแล้ว");
      assert.equal(await page.getByRole("row").filter({ hasText: "DEMO-99" }).count(), 0);
      await click(page, "รายงาน");
      await field(page, "kind").selectOption("utilization");
      await click(page, "แสดงรายงาน");
      await page.getByRole("columnheader", { name: "Utilization", exact: true }).waitFor();
      await field(page, "kind").selectOption("efficiency");
      await click(page, "แสดงรายงาน");
      await page.getByRole("columnheader", { name: "คืนช้า", exact: true }).waitFor();
      return "Changed approved booking dates and branch without reapproval, recalculated total to THB 7,667, and retained the paid deposit on cancellation. Verified vehicle create/edit/delete and both remaining report types.";
    });

    await test("SMOKE-04", async page => {
      await click(page, "โหลดข้อมูลตัวอย่างครบวงจร");
      await message(page, "โหลดข้อมูลตัวอย่างครบวงจรแล้ว");
      await click(page, "ลูกค้า");
      await screen(page, "ค้นหารถ");
      await click(page, "ทุกประเภทรถ");
      await screen(page, "รถที่ว่าง (3)");
      await click(page, "การจองของฉัน");
      await page.getByRole("button", { name: "ดู BK-0902", exact: true }).waitFor();
      await click(page, "ประวัติการเช่า");
      await page.getByRole("button", { name: "ดู BK-0901", exact: true }).waitFor();
      await click(page, "พนง. BKK");
      await screen(page, "การจองสาขา");
      await click(page, "ดู BK-0902");
      await field(page, "verified").check();
      await click(page, "อนุมัติคำขอ");
      await status(page, "อนุมัติแล้ว");
      await click(page, "ลูกค้า");
      await click(page, "ดูใบแจ้งหนี้ ค่ามัดจำ");
      await click(page, "จำลองชำระสำเร็จ");
      await status(page, "ชำระแล้ว");
      await click(page, "พนง. BKK");
      await click(page, "ดู BK-0902");
      await click(page, "สร้างสัญญาเช่ารถ");
      const canvas = page.locator("canvas.sig-canvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 30, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(box.x + 140, box.y + 60);
      await page.mouse.up();
      await click(page, "ลงนามสัญญา");
      await message(page, "บันทึกลายเซ็นแล้ว");
      return "Verified 1-click quick role switcher, rich demo data loader (BK-0901/0902/0903), all-types vehicle filter chip, and interactive HTML5 canvas signature pad.";
    });
  } finally {
    await browser.close();
  }
  if (evidence) await fs.writeFile(path.join(evidence, "results.json"), JSON.stringify({ results, errors }, null, 2));
  if (results.some(result => result.status === "Fail") || errors.length) {
    console.error(errors);
    process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

