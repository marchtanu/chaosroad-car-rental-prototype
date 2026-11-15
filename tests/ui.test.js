"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const model = require("../model.js");
const ui = require("../ui.js");
const screens = require("../screens.js");

function makeContext(role = "customer", overrides = {}) {
  const state = model.snapshot();
  const actor =
    role === "guest" ? null : state.users.find((u) => u.role === role);
  return {
    state,
    actor,
    username: actor ? actor.username : "",
    selected: "",
    loginRole: "customer",
    search: null,
    filter: "all",
    staffFilter: { branch: "all", query: "" },
    report: null,
    demoQr: (text) => `<svg data-qr="${text}"></svg>`,
    ...overrides,
  };
}

describe("ChaosRoadUI & Screen Alignment", () => {
  beforeEach(() => {
    store.clear();
    model.reset();
  });

  it("details() wraps every dt/dd pair in .detail-item and escapes HTML", () => {
    const html = ui.details([
      ["ลูกค้า", '<script>alert("xss")</script>'],
      ["ยอดรวม", "THB 3,000"],
    ]);

    assert.match(html, /<dl><div class="detail-item"><dt>ลูกค้า<\/dt><dd>&lt;script&gt;/);
    assert.match(html, /<div class="detail-item"><dt>ยอดรวม<\/dt><dd>THB 3,000<\/dd><\/div><\/dl>/);
  });

  it("outbox() renders consistent staff kicker, KPI strip, grid cards, and booking links", () => {
    model.loadRichDemo();
    const ctx = makeContext("staff");
    const html = screens.registry.outbox(ctx);

    assert.match(html, /RENTAL STAFF/);
    assert.match(html, /class="kpi-grid"/);
    assert.match(html, /class="grid"/);
    assert.match(html, /class="card-header"/);
    assert.match(html, /ส่งแล้ว \(จำลอง\)/);
    assert.match(html, /class="detail-item"/);
    assert.match(html, /data-go="booking"/);
  });

  it("fleet() uses .toolbar and .toolbar-form instead of nested .actions", () => {
    const ctx = makeContext("admin");
    const html = screens.registry.fleet(ctx);

    assert.match(html, /class="toolbar"/);
    assert.match(html, /class="toolbar-form"/);
    assert.doesNotMatch(html, /<div class="actions">.*<form.*<div class="actions">/);
  });

  it("request() renders both submit and back-to-search buttons", () => {
    const ctx = makeContext("customer", {
      selected: "city",
      search: {
        pick: "BKK",
        drop: "CNX",
        type: "Sedan",
        start: "2026-11-12T10:00",
        end: "2026-11-16T10:00",
      },
    });
    const html = screens.registry.request(ctx);

    assert.match(html, /ส่งคำขอจอง/);
    assert.match(html, /กลับไปค้นหา/);
  });

  it("booking() displays next-step guidance with 1-click role switch button", () => {
    model.loadRichDemo();
    const ctx = makeContext("customer", { selected: "BK-0902" });
    const html = screens.registry.booking(ctx);

    assert.match(html, /ขั้นตอนถัดไป:/);
    assert.match(html, /สลับเป็น พนง\. BKK/);
  });

  it("all primary portal screens render without throwing on rich demo data", () => {
    model.loadRichDemo();

    assert.doesNotThrow(() => screens.registry.home(makeContext("guest")));
    assert.doesNotThrow(() => screens.registry.login(makeContext("guest")));
    assert.doesNotThrow(() => screens.registry.register(makeContext("guest")));

    for (const screen of ["search", "bookings", "history"]) {
      assert.doesNotThrow(() => screens.registry[screen](makeContext("customer")));
    }
    for (const screen of ["queue", "fleet", "outbox"]) {
      assert.doesNotThrow(() => screens.registry[screen](makeContext("staff")));
    }
    for (const screen of ["fleet", "pricing", "maintenance", "accounts", "reports"]) {
      assert.doesNotThrow(() => screens.registry[screen](makeContext("admin")));
    }
  });
});
