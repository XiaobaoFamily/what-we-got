import test from "node:test";
import assert from "node:assert/strict";
import { buildCalorieRows } from "../src/lib/calories.ts";
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
