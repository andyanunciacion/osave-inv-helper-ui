// Page-level sanity check (main-file.md §4's row check, one level up): the
// receipt prints its own totals under the table, so the review screen can
// tell staff when the rows they're about to confirm don't add up to them —
// usually a row OCR missed entirely, or a misread quantity. Like the per-row
// price mismatch, it's a warning, never a block.

import type { DraftItem, ReceiptTotals } from "../types";

export type TotalsCheckKind = "item_count" | "total_box" | "total_pcs" | "total_value";

export interface TotalsMismatch {
  kind: TotalsCheckKind;
  printed: number;
  counted: number;
}

export interface TotalsCheck {
  mismatches: TotalsMismatch[];
  // How many printed totals were compared — 0 when the page has no totals
  // block (a middle page) or none of it was readable.
  checked: number;
}

const number = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasContent = (item: DraftItem): boolean =>
  [item.item_code, item.item_name, item.quantity, item.item_price, item.total_item_price].some((v) => v.trim());

export function checkReceiptTotals(totals: ReceiptTotals, items: DraftItem[]): TotalsCheck {
  const rows = items.filter(hasContent);
  const mismatches: TotalsMismatch[] = [];
  let checked = 0;

  const compare = (kind: TotalsCheckKind, printedRaw: string, counted: number | null, tolerance = 0): void => {
    const printed = number(printedRaw);
    if (printed === null || counted === null) return;
    checked++;
    if (Math.abs(printed - counted) > tolerance) mismatches.push({ kind, printed, counted });
  };

  // "Total Item/s" counts distinct item codes: the same SAN printed on two
  // lines (crate deposits) is one item. A row without a code counts alone.
  const codes = rows.map((item, i) => item.item_code.trim() || `#row${i}`);
  compare("item_count", totals.total_items, new Set(codes).size);

  // Sums are only compared once every cell they need is filled in — blank
  // cells are already outlined on their rows, so a partial sum would just be
  // a second warning about the same thing.
  const quantitySum = (unit: string): number | null => {
    const unitRows = rows.filter((item) => item.unit === unit);
    if (rows.some((item) => !item.unit) || unitRows.some((item) => number(item.quantity) === null)) return null;
    return unitRows.reduce((sum, item) => sum + (number(item.quantity) ?? 0), 0);
  };
  compare("total_box", totals.total_box, quantitySum("BOX"));
  compare("total_pcs", totals.total_pcs, quantitySum("PIECE"));

  const totalsRead = rows.map((item) => number(item.total_item_price));
  const valueSum = totalsRead.every((v) => v !== null)
    ? totalsRead.reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : null;
  compare("total_value", totals.total_value, valueSum, 0.005);

  return { mismatches, checked };
}
