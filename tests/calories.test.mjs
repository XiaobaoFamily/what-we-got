import test from "node:test";
import assert from "node:assert/strict";
import { buildCalorieRows, filterCalorieRows } from "../src/lib/calories.ts";
import { findCalorieReference } from "../src/data/calorieReferences.ts";

test("raw is default; cooked values are independent, not converted", () => {
  assert.equal(findCalorieReference("鸡胸肉").kcal, 120);
  assert.equal(findCalorieReference("鸡胸肉", "cooked").kcal, 165);
  assert.equal(findCalorieReference("虾"), undefined);
  assert.equal(findCalorieReference("西兰花", "cooked"), undefined);
  assert.equal(findCalorieReference("某品牌鸡胸肉"), undefined);
  assert.equal(findCalorieReference("炸鸡胸肉"), undefined);
});

test("table deduplicates templates and stock; missing values stay null; manual blanks and zero override references", () => {
  const items = [ { name: "鸡胸肉", tags: [] }, { name: "鸡胸肉", tags: [] }, { name: "品牌酸奶", tags: [] }, { name: "猫粮", tags: ["小宝"] } ];
  const initial = buildCalorieRows(items, []);
  assert.equal(initial.length, 2);
  assert.equal(initial.find((row) => row.name === "品牌酸奶").kcal, null);
  const custom = { id: "c", household_id: "h", name: "鸡胸肉", preparation: "raw", kcal: null, amount: 1, unit: "个", notes: "", source_url: "" };
  assert.equal(buildCalorieRows(items, [custom]).find((row) => row.name === "鸡胸肉").kcal, null);
  assert.equal(buildCalorieRows(items, [{ ...custom, kcal: 0 }]).find((row) => row.name === "鸡胸肉").kcal, 0);
  assert.equal(buildCalorieRows(items, [custom], "cooked").find((row) => row.name === "鸡胸肉").kcal, 165);
  const manualOnly = { ...custom, name: "自制菜" };
  assert.equal(buildCalorieRows([], [manualOnly], "cooked")[0].kcal, null);
});

test("FDA serving conversion does not confuse a serving with 100 grams", () => {
  assert.equal(findCalorieReference("西兰花").kcal, Math.round(45 / 148 * 100));
  assert.equal(findCalorieReference("全脂牛奶").unit, "克");
});

test("calorie filters combine name and any selected tag, retaining tags across saved values and raw/cooked", () => {
  const items = [{ name: "鸡胸肉", tags: ["肉类"] }, { name: "鸡胸肉", tags: ["新购"] }, { name: "西兰花", tags: ["蔬菜"] }];
  const saved = [{ name: "鸡胸肉", preparation: "raw", kcal: 0, amount: 100, unit: "克", notes: "", source_url: "" }];
  const rows = buildCalorieRows(items, saved);
  assert.deepEqual(rows.find((row) => row.name === "鸡胸肉").tags, ["肉类", "新购"]);
  assert.equal(filterCalorieRows(rows, "鸡", ["蔬菜", "肉类"], false).length, 1);
  assert.equal(filterCalorieRows(rows, "鸡", ["蔬菜"], false).length, 0);
  assert.equal(filterCalorieRows(rows, "", ["肉类"], true).length, 0);
  const cooked = buildCalorieRows(items, saved, "cooked");
  assert.deepEqual(filterCalorieRows(cooked, "", ["蔬菜"], true).map((row) => row.name), ["西兰花"]);
  assert.equal(filterCalorieRows(rows, "  ", [], false).length, 2);
});
