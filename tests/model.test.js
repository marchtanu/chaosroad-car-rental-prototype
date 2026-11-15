"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// Minimal in-memory localStorage mock for Node.js test execution
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const model = require("../model.js");

const TRIP_BKK_CNX = {
  pick: "BKK",
  drop: "CNX",
  type: "Sedan",
  start: "2026-11-12T10:00",
  end: "2026-11-16T10:00",
};

function createSampleBooking() {
  return model.run("request", "customer", {
    ...TRIP_BKK_CNX,
    carId: "city",
    identity: { key: "id-1", name: "SAMPLE-ID.png", size: 1024 },
    licence: { key: "lic-1", name: "SAMPLE-LICENCE.png", size: 1024 },
  });
}

function approveAndPayDeposit(bookingId) {
  model.run("review", "staff.bkk", {
    id: bookingId,
    outcome: "approve",
    verified: "on",
  });
  const state = model.snapshot();
  const depositInv = state.invoices.find(
    (inv) => inv.bookingId === bookingId && inv.kind === "deposit",
  );
  model.run("pay", "customer", {
    invoiceId: depositInv.id,
    outcome: "paid",
    payerBank: "ธนาคารกสิกรไทย (KBank) ****2231",
  });
  return depositInv;
}

describe("ChaosRoad Domain Model (TC-01 to TC-03 + Admin)", () => {
  beforeEach(() => {
    store.clear();
    model.reset();
  });

  it("TC-01-H: searches available cars, computes quote with promo & one-way fee, and creates pending booking", () => {
    const state = model.snapshot();
    const trip = model.parseTrip(TRIP_BKK_CNX);
    const matches = state.cars.filter((car) => model.available(state, car, trip));

    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, "city");

    const quote = model.quote(matches[0], trip);
    assert.deepEqual(
      {
        days: quote.days,
        base: quote.base,
        discount: quote.discount,
        oneWay: quote.oneWay,
        total: quote.total,
        deposit: quote.deposit,
      },
      {
        days: 4,
        base: 5160,
        discount: 516,
        oneWay: 3500,
        total: 8144,
        deposit: 3000,
      },
    );

    const booking = createSampleBooking();
    assert.equal(booking.id, "BK-0001");
    assert.equal(booking.status, "pending");
    assert.equal(model.snapshot().invoices.length, 0);
  });

  it("TC-01-U: rejects invalid trip where return time is before pickup time", () => {
    assert.throws(
      () =>
        model.parseTrip({
          ...TRIP_BKK_CNX,
          end: "2026-11-11T10:00",
        }),
      /วันเวลาคืนต้องอยู่หลังวันเวลารับรถ/,
    );
  });

  it("TC-02-H: approves booking, sends branch outbox email, issues deposit invoice, and records payment", () => {
    const booking = createSampleBooking();
    const depositInv = approveAndPayDeposit(booking.id);

    const state = model.snapshot();
    const updatedBooking = state.bookings.find((b) => b.id === booking.id);
    const paidInv = state.invoices.find((inv) => inv.id === depositInv.id);

    assert.equal(updatedBooking.status, "approved");
    assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].to, "customer@example.test");
    assert.equal(paidInv.status, "paid");
    assert.equal(paidInv.amount, 3000);
    assert.match(paidInv.reference, /^PP-/);
  });

  it("TC-02-U: rejects booking with reason and creates neither outbox email nor deposit invoice", () => {
    const booking = createSampleBooking();
    model.run("review", "staff.bkk", {
      id: booking.id,
      outcome: "reject",
      reason: "ใบขับขี่หมดอายุ",
    });

    const state = model.snapshot();
    const updated = state.bookings.find((b) => b.id === booking.id);
    assert.equal(updated.status, "rejected");
    assert.equal(updated.reason, "ใบขับขี่หมดอายุ");
    assert.equal(state.messages.length, 0);
    assert.equal(state.invoices.length, 0);
  });

  it("SMOKE-01: voids unpaid deposit invoice and cancels booking after 24h expiry", () => {
    const booking = createSampleBooking();
    model.run("review", "staff.bkk", {
      id: booking.id,
      outcome: "approve",
      verified: "on",
    });

    model.advance();

    const state = model.snapshot();
    const expiredBooking = state.bookings.find((b) => b.id === booking.id);
    const voidInv = state.invoices.find((i) => i.bookingId === booking.id);
    assert.equal(expiredBooking.status, "cancelled");
    assert.equal(voidInv.status, "void");
  });

  it("TC-03-U: blocks vehicle handover until both staff and customer sign the contract", () => {
    const booking = createSampleBooking();
    approveAndPayDeposit(booking.id);
    model.run("contract", "staff.bkk", { id: booking.id });
    model.run("sign", "staff.bkk", {
      id: booking.id,
      signature: "Natee Demo",
      consent: "on",
    });

    assert.throws(
      () =>
        model.run("handover", "staff.bkk", {
          id: booking.id,
          recordedAt: "2026-11-12T10:00",
          odometer: 18240,
          fuel: 100,
          issue: true,
        }),
      /ต้องชำระมัดจำและลงนามครบทั้งสองฝ่าย/,
    );
  });

  it("TC-03-H: completes full handover, cross-branch return (BKK -> CNX), and extra charges", () => {
    const booking = createSampleBooking();
    approveAndPayDeposit(booking.id);
    model.run("contract", "staff.bkk", { id: booking.id });
    model.run("sign", "staff.bkk", {
      id: booking.id,
      signature: "Natee Demo",
      consent: "on",
    });
    model.run("sign", "customer", {
      id: booking.id,
      signature: "Pimjai Demo",
      consent: "on",
    });

    model.run("handover", "staff.bkk", {
      id: booking.id,
      recordedAt: "2026-11-12T10:00",
      odometer: 18240,
      fuel: 100,
      notes: "ปกติ",
      issue: true,
    });

    let state = model.snapshot();
    const balanceInv = state.invoices.find(
      (i) => i.bookingId === booking.id && i.kind === "balance",
    );
    assert.equal(balanceInv.amount, 5144);

    model.run("pay", "customer", {
      invoiceId: balanceInv.id,
      outcome: "paid",
    });

    // Return 3h 5m late at CNX with fuel + damage fees
    model.run("returnCar", "staff.cnx", {
      id: booking.id,
      recordedAt: "2026-11-16T13:05",
      odometer: 18760,
      fuel: 65,
      fuelFee: 800,
      damageFee: 2500,
      condition: "maintenance",
      notes: "กันชนหลังมีรอย",
      issue: true,
    });

    state = model.snapshot();
    const completed = state.bookings.find((b) => b.id === booking.id);
    const car = model.getVehicle(state, "city");
    const extraInv = state.invoices.find(
      (i) => i.bookingId === booking.id && i.kind === "extra",
    );

    assert.equal(completed.status, "completed");
    assert.deepEqual(completed.returned.charges, {
      lateHours: 3,
      late: 600,
      fuel: 800,
      damage: 2500,
      total: 3900,
    });
    assert.equal(extraInv.amount, 3900);
    assert.equal(extraInv.branch, "CNX");
    assert.equal(car.branch, "CNX");
    assert.equal(car.status, "maintenance");
    assert.equal(car.odometer, 18760);
  });

  it("SMOKE-02: maintenance plan blocks overlapping search and updates vehicle upon result", () => {
    const plan = model.run("plan", "admin", {
      carId: "city",
      task: "เช็กระยะ 20,000 กม.",
      start: "2026-11-13T08:00",
      end: "2026-11-14T18:00",
      trigger: "date",
    });

    let state = model.snapshot();
    const trip = model.parseTrip(TRIP_BKK_CNX);
    const availableDuringMaint = state.cars.filter((car) =>
      model.available(state, car, trip),
    );
    assert.equal(availableDuringMaint.length, 0);

    model.run("maintenance", "admin", {
      id: plan.id,
      result: "เปลี่ยนถ่ายน้ำมันเครื่องเรียบร้อย",
      cost: 2400,
      odometer: 18500,
      status: "available",
    });

    state = model.snapshot();
    assert.equal(model.getVehicle(state, "city").odometer, 18500);
    const availableAfter = state.cars.filter((car) =>
      model.available(state, car, trip),
    );
    assert.equal(availableAfter.length, 1);
  });
});
