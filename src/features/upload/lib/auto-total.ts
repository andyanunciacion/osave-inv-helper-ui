// Fills a row's blank Total from its own arithmetic, Total = Qty × Unit/Box ×
// Price (main-file.md §4), so staff typing a row in by hand don't have to
// multiply it out. The filled Total is marked calculated and stays live —
// recomputed as Qty, Unit/Box or Price change — until staff type into the
// Total themselves. A Total read off the receipt is never touched: it's the
// printed value the other cells are checked against.

import type { DraftItem } from "../types";

// The cells a calculated Total depends on.
export const AUTO_TOTAL_INPUTS = ["quantity", "unit_count", "item_price"] as const;

const number = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function withAutoTotal(item: DraftItem): DraftItem {
  const calculated = item.inferred.includes("total_item_price");
  // Printed on the receipt, or typed by staff.
  if (item.total_item_price.trim() && !calculated) return item;

  const quantity = number(item.quantity);
  const unitCount = number(item.unit_count);
  const price = number(item.item_price);

  if (quantity === null || unitCount === null || price === null) {
    // A calculated Total whose inputs were cleared no longer means anything —
    // back to blank, so the row is outlined as incomplete again.
    return calculated
      ? { ...item, total_item_price: "", inferred: item.inferred.filter((f) => f !== "total_item_price") }
      : item;
  }

  const total = (Math.round(quantity * unitCount * price * 100) / 100).toFixed(2);
  return {
    ...item,
    total_item_price: total,
    inferred: calculated ? item.inferred : [...item.inferred, "total_item_price"],
  };
}
