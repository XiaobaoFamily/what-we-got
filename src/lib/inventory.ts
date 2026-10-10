import type { InventoryItem } from "../types";

export function recentNamedItems(items: InventoryItem[]): InventoryItem[] {
  const latest = new Map<string, InventoryItem>();
  for (const item of [...items].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))) {
    const name = item.name.trim().toLocaleLowerCase();
    if (!latest.has(name)) latest.set(name, item);
  }
  return [...latest.values()];
}

export function previousShelfLifeDays(items: InventoryItem[], name: string, zone: InventoryItem["storage_zone"]): number | null {
  const matches = items.filter((item) => item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase() && item.storage_zone === zone)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  for (const item of matches) {
    if (!item.purchased_on || !item.expires_on) continue;
    const days = (Date.parse(`${item.expires_on}T00:00:00Z`) - Date.parse(`${item.purchased_on}T00:00:00Z`)) / 86400000;
    if (Number.isInteger(days) && days >= 0) return days;
  }
  return null;
}

export function effectiveExpiry(item: InventoryItem): string | null {
  if (!item.opened_on || item.opened_days == null) return item.expires_on;
  const date = new Date(`${item.opened_on}T12:00:00`);
  date.setDate(date.getDate() + item.opened_days);
  const openedExpiry = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return item.expires_on && item.expires_on < openedExpiry ? item.expires_on : openedExpiry;
}

export function sortBatches(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) =>
    Number(Number(a.quantity) === 0) - Number(Number(b.quantity) === 0)
    || (effectiveExpiry(a) ?? "9999-12-31").localeCompare(effectiveExpiry(b) ?? "9999-12-31")
    || a.name.localeCompare(b.name, "zh-CN")
    || a.created_at.localeCompare(b.created_at)
    || a.id.localeCompare(b.id)
  );
}

// Units are part of a product's identity; never sum grams and packages together.
export function productTotals(items: InventoryItem[]): InventoryItem[] {
  const totals = new Map<string, InventoryItem>();
  for (const item of items) {
    const key = item.product_id || `${item.name.trim().toLowerCase()}:${item.unit}`;
    const previous = totals.get(key);
    if (previous) previous.quantity += Number(item.quantity);
    else totals.set(key, { ...item, quantity: Number(item.quantity) });
  }
  return [...totals.values()];
}
