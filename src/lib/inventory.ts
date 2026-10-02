import type { InventoryItem } from "../types";

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
