// Rows the backend will combine on save (mergeDuplicateItems in the server's
// src/routes/deliveries.ts): same item code, or — for rows with no code — the
// same description. Found here so staff see it *before* Confirm: after
// saving, only quantity can be edited, so a misread code that merged two
// different items can't really be undone.
//
// The key and the "fields disagree" check mirror the server's, applied to the
// values confirm will actually send (trimmed, parsed). Keep them in sync.

import type { DraftItem } from "../types";

// The cells the server compares between repeats; a difference usually means
// an item code was misread rather than genuinely repeated.
export type RepeatCompareField = "item_name" | "unit" | "unit_count" | "item_price";

export interface RepeatedItemGroup {
  // The row's item code, or its description when it has none.
  label: string;
  matchedBy: "item_code" | "item_name";
  // In draft order — the first one's name/unit/price is what the server keeps.
  localIds: string[];
  // Cells that differ from the first row in at least one other row. Empty for
  // a clean repeat (quantities and totals are simply added together).
  differingFields: RepeatCompareField[];
}

// One row's share of a group, for the marker on that row.
export interface RowRepeat extends Pick<RepeatedItemGroup, "matchedBy" | "differingFields"> {
  otherRows: number;
}

const COMPARE_FIELDS: RepeatCompareField[] = ["item_name", "unit", "unit_count", "item_price"];

const FIELD_LABELS: Record<RepeatCompareField, string> = {
  item_name: "Description",
  unit: "UOM",
  unit_count: "Unit/Box",
  item_price: "Price",
};

const number = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function comparable(item: DraftItem, field: RepeatCompareField): string | number | null {
  switch (field) {
    case "item_name":
      return item.item_name.trim().toLowerCase();
    case "unit":
      return item.unit === "BOX" || item.unit === "PIECE" ? item.unit : null;
    case "unit_count":
    case "item_price":
      return number(item[field]);
  }
}

export function findRepeatedItems(items: DraftItem[]): RepeatedItemGroup[] {
  const groups = new Map<string, DraftItem[]>();
  for (const item of items) {
    // Rows with no description aren't sent (and block Confirm anyway).
    const name = item.item_name.trim();
    if (!name) continue;
    const code = item.item_code.trim();
    const key = code || `name:${name.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const repeated: RepeatedItemGroup[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [first, ...rest] = group;
    const code = first.item_code.trim();
    repeated.push({
      label: code || first.item_name.trim(),
      matchedBy: code ? "item_code" : "item_name",
      localIds: group.map((item) => item.localId),
      differingFields: COMPARE_FIELDS.filter((field) =>
        rest.some((row) => comparable(row, field) !== comparable(first, field)),
      ),
    });
  }
  return repeated;
}

// "Price differs", "UOM and Price differ"
export function describeDifferingFields(fields: RepeatCompareField[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field]);
  if (labels.length <= 1) return `${labels.join("")} differs`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]} differ`;
}

// "Same item code as 1 other row, but Price differs — check the code
// against the receipt."
export function describeRowRepeat({ matchedBy, differingFields, otherRows }: RowRepeat): string {
  const same = `Same ${matchedBy === "item_code" ? "item code" : "description"} as ${otherRows} other row${otherRows === 1 ? "" : "s"}`;
  if (differingFields.length > 0) {
    return `${same}, but ${describeDifferingFields(differingFields)} — check the ${matchedBy === "item_code" ? "code" : "description"} against the receipt.`;
  }
  return `${same} — saved as one row, with Qty and Total added together.`;
}

// "4272 (2 rows)"
export function repeatedGroupLabel(group: RepeatedItemGroup): string {
  return `${group.label} (${group.localIds.length} rows)`;
}
