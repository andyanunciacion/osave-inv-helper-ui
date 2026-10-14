// The review screen's running grand totals: summed from the rows as they
// stand (edited, calculated or typed), never from the totals OCR read off the
// receipt — so staff can hold them up against the paper and catch a row they
// keyed in wrong. A row with a cell still blank is left out of that sum and
// counted, so a partial number is never passed off as the final one.

import type { DraftItem } from "../types";

export interface DraftSummary {
  // Sum of Qty over BOX rows — the receipt's "Total Box".
  totalBox: number;
  // Rows left out of totalBox: a BOX row with no Qty, or a row with no UOM
  // (it can't be told whether it's a box).
  rowsMissingBox: number;
  // Sum of every row's Total — the receipt's "Total Value".
  totalValue: number;
  rowsMissingTotal: number;
}

const number = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// `rows` are the rows that will be saved — fully empty ones already left out.
export function summarizeDraft(rows: DraftItem[]): DraftSummary {
  const summary: DraftSummary = { totalBox: 0, rowsMissingBox: 0, totalValue: 0, rowsMissingTotal: 0 };

  for (const row of rows) {
    const quantity = number(row.quantity);
    if (!row.unit || (row.unit === "BOX" && quantity === null)) summary.rowsMissingBox++;
    else if (row.unit === "BOX") summary.totalBox += quantity ?? 0;

    const total = number(row.total_item_price);
    if (total === null) summary.rowsMissingTotal++;
    else summary.totalValue += total;
  }

  // Cents only — float addition otherwise leaves 9172.999999.
  summary.totalValue = Math.round(summary.totalValue * 100) / 100;
  return summary;
}
