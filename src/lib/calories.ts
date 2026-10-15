import { calorieNameKey, findCalorieReference } from "../data/calorieReferences.ts";
import type { CalorieEntry, InventoryItem } from "../types";

export type CalorieRow = Omit<CalorieEntry, "id" | "household_id"> & { id?: string; origin: "saved" | "reference" | "blank" };
export function buildCalorieRows(items: InventoryItem[], saved: CalorieEntry[], preparation: "raw" | "cooked" = "raw"): CalorieRow[] {
  const rows = new Map<string, CalorieRow>();
  for (const item of [...items, ...saved.map((entry) => ({ name: entry.name, tags: [] }))]) {
    if (item.tags?.some((tag) => ["小宝", "日用品"].includes(tag))) continue;
    const key = calorieNameKey(item.name);
    if (!key || rows.has(key)) continue;
    const reference = findCalorieReference(item.name, preparation);
    rows.set(key, { preparation, name: item.name.trim(), kcal: reference?.kcal ?? null, amount: reference?.amount ?? 100,
      unit: reference?.unit ?? "克", notes: reference?.notes ?? "", source_url: reference?.source_url ?? "", origin: reference ? "reference" : "blank" });
  }
  for (const entry of saved.filter((entry) => entry.preparation === preparation)) rows.set(calorieNameKey(entry.name), { ...entry, origin: "saved" });
  return [...rows.values()].sort((a, b) => Number(a.kcal !== null) - Number(b.kcal !== null) || a.name.localeCompare(b.name, "zh-CN"));
}
