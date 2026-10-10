import test from "node:test";
import assert from "node:assert/strict";
import { effectiveExpiry, productTotals, sortBatches, recentNamedItems, previousShelfLifeDays } from "../src/lib/inventory.ts";

const batch = (overrides = {}) => ({
  id: "one", product_id: "milk", name: "牛奶", unit: "盒", quantity: 1,
  expires_on: null, opened_on: null, opened_days: null,
  created_at: "2026-09-01T00:00:00Z", ...overrides
});

test("name matching chooses the latest batch regardless of unit or remaining stock", () => {
  const old = batch({ unit: "盒" });
  const latest = batch({ id: "new", product_id: "milk-liter", unit: "升", quantity: 0, created_at: "2026-10-01T00:00:00Z" });
  assert.deepEqual(recentNamedItems([old, latest]), [latest]);
});

test("historical shelf life uses valid purchase-to-expiry days in the same storage zone", () => {
  const history = [
    batch({ storage_zone: "chilled", purchased_on: "2026-10-31", expires_on: "2026-11-07", opened_on: "2026-11-01", opened_days: 2 }),
    batch({ id: "other-zone", storage_zone: "frozen", purchased_on: "2026-10-01", expires_on: "2026-12-01", created_at: "2026-10-01T00:00:00Z" }),
    batch({ id: "missing", storage_zone: "chilled", purchased_on: null, expires_on: "2026-12-01", created_at: "2026-10-02T00:00:00Z" })
  ];
  assert.equal(previousShelfLifeDays(history, " 牛奶 ", "chilled"), 7);
  assert.equal(previousShelfLifeDays(history, "牛奶", "pantry"), null);
  assert.equal(previousShelfLifeDays([batch({ storage_zone: "chilled", purchased_on: "2026-10-02", expires_on: "2026-10-01" })], "牛奶", "chilled"), null);
});

test("opening never extends the packaging deadline", () => {
  assert.equal(effectiveExpiry(batch({ expires_on: "2026-10-03", opened_on: "2026-10-01", opened_days: 5 })), "2026-10-03");
  assert.equal(effectiveExpiry(batch({ expires_on: "2026-10-20", opened_on: "2026-10-01", opened_days: 5 })), "2026-10-06");
  assert.equal(effectiveExpiry(batch({ opened_on: "2026-12-30", opened_days: 5 })), "2027-01-04");
  assert.equal(effectiveExpiry(batch({ opened_on: "2028-02-28", opened_days: 1 })), "2028-02-29");
  assert.equal(effectiveExpiry(batch({ opened_on: "2026-10-31", opened_days: 2 })), "2026-11-02");
  assert.equal(effectiveExpiry(batch()), null);
});

test("zero batches come last even if expired; effective opening dates drive ordering", () => {
  const input = [
    batch({ id: "empty", quantity: 0, expires_on: "2020-01-01" }),
    batch({ id: "undated" }),
    batch({ id: "sealed", expires_on: "2026-10-10" }),
    batch({ id: "opened", expires_on: "2026-10-20", opened_on: "2026-10-01", opened_days: 3 })
  ];
  assert.deepEqual(sortBatches(input).map((item) => item.id), ["opened", "sealed", "undated", "empty"]);
  assert.equal(input[0].id, "empty", "sorting must not mutate React state");
});

test("restocking totals include opened and unopened batches without mixing products/units", () => {
  const input = [batch({ quantity: 2 }), batch({ id: "two", quantity: 1, opened_on: "2026-10-01", opened_days: 3 }), batch({ id: "zero", quantity: 0 }), batch({ id: "liters", product_id: "milk-liters", unit: "升", quantity: 5 })];
  assert.deepEqual(productTotals(input).map((item) => item.quantity), [3, 5]);
  assert.equal(input[0].quantity, 2);
});
