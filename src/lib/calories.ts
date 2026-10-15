import { calorieNameKey, findCalorieReference } from "../data/calorieReferences.ts";
import type { CalorieEntry, InventoryItem } from "../types";

export type CalorieRow = Omit<CalorieEntry, "id" | "household_id"> & { id?: string; tags: string[]; origin: "saved" | "reference" | "blank" };

export const CALORIE_TAG_ORDER = ["蔬菜", "肉类", "乳制品", "瓜果", "主食", "调味料", "预制菜", "饮料", "零食", "烘焙"];
function categoryRank(row: CalorieRow): number {
  const rank = CALORIE_TAG_ORDER.findIndex((tag) => row.tags.includes(tag));
  return rank === -1 ? CALORIE_TAG_ORDER.length : rank;
}

export function shortCalorieState(notes: string, preparation: "raw" | "cooked"): string {
  // Old saved entries can contain full provenance paragraphs; keep that data but
  // only show the leading food-state description in the compact table.
  return notes.split(/[；;。\n]/)[0].trim().slice(0, 45) || (preparation === "raw" ? "生重 / 烹饪前" : "熟重 / 烹饪后");
}
export function buildCalorieRows(items: InventoryItem[], saved: CalorieEntry[], preparation: "raw" | "cooked" = "raw"): CalorieRow[] {
  const rows = new Map<string, CalorieRow>();
  const tagsByName = new Map<string, string[]>();
  for (const item of items) {
    if (item.tags?.some((tag) => ["小宝", "日用品"].includes(tag))) continue;
    const key = calorieNameKey(item.name);
    tagsByName.set(key, [...new Set([...(tagsByName.get(key) ?? []), ...(item.tags ?? [])])]);
  }
  for (const item of [...items, ...saved.map((entry) => ({ name: entry.name, tags: [] }))]) {
    if (item.tags?.some((tag) => ["小宝", "日用品"].includes(tag))) continue;
    const key = calorieNameKey(item.name);
    if (!key || rows.has(key)) continue;
    const reference = findCalorieReference(item.name, preparation);
    rows.set(key, { preparation, tags: tagsByName.get(key) ?? [], name: item.name.trim(), kcal: reference?.kcal ?? null, amount: reference?.amount ?? 100,
      unit: reference?.unit ?? "克", notes: reference?.notes ?? "", source_url: reference?.source_url ?? "", origin: reference ? "reference" : "blank" });
  }
  for (const entry of saved.filter((entry) => entry.preparation === preparation)) rows.set(calorieNameKey(entry.name), { ...entry, tags: tagsByName.get(calorieNameKey(entry.name)) ?? [], origin: "saved" });
  return [...rows.values()].sort((a, b) => Number(a.kcal === null) - Number(b.kcal === null)
    || categoryRank(a) - categoryRank(b)
    || a.name.localeCompare(b.name, "zh-CN"));
}

export function filterCalorieRows(rows: CalorieRow[], query: string, tags: string[], onlyBlank: boolean): CalorieRow[] {
  return rows.filter((row) => (!onlyBlank || row.kcal === null)
    && calorieNameKey(row.name).includes(calorieNameKey(query))
    && (!tags.length || tags.some((tag) => row.tags.includes(tag))));
}
