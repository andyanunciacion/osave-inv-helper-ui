import { describe, expect, it } from "vitest";
import type { DraftItem, ReceiptTotals } from "../types";
import { checkReceiptTotals } from "./receipt-totals";

function item(overrides: Partial<DraftItem>): DraftItem {
  return {
    localId: crypto.randomUUID(),
    item_code: "4271",
    item_name: "Beer Crate Deposit",
    unit_count: "1",
    quantity: "1",
    unit: "PIECE",
    item_price: "84.00",
    total_item_price: "84.00",
    inferred: [],
    has_annotation: false,
    ...overrides,
  };
}

// Page 12 of 12 of a real receipt: 7 rows, one SAN printed twice.
const rows = (): DraftItem[] => [
  item({ item_code: "4271" }),
  item({ item_code: "4272" }),
  item({ item_code: "4272" }),
  item({ item_code: "9005", item_price: "480.00", total_item_price: "480.00" }),
  item({ item_code: "4281", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
  item({ item_code: "4282", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
  item({ item_code: "4287", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
];

const printed: ReceiptTotals = { total_pcs: "4", total_box: "3", total_items: "6", total_value: "840.00" };

describe("checkReceiptTotals", () => {
  it("passes when the rows add up to every printed total, counting a repeated SAN once", () => {
    expect(checkReceiptTotals(printed, rows())).toEqual({ mismatches: [], checked: 4 });
  });

  it("flags a missing row through the item count and the total value", () => {
    const { mismatches } = checkReceiptTotals(printed, rows().slice(0, 6));
    expect(mismatches).toEqual([
      { kind: "item_count", printed: 6, counted: 5 },
      { kind: "total_box", printed: 3, counted: 2 },
      { kind: "total_value", printed: 840, counted: 804 },
    ]);
  });

  it("flags a quantity that doesn't add up to Total Box / Total Pcs", () => {
    const edited = rows();
    edited[4].quantity = "2";
    edited[0].quantity = "3";
    const kinds = checkReceiptTotals(printed, edited).mismatches.map((m) => m.kind);
    expect(kinds).toEqual(["total_box", "total_pcs"]);
  });

  it("skips a sum while one of its cells is still blank — the blank cell is already flagged", () => {
    const edited = rows();
    edited[4].quantity = "";
    edited[5].total_item_price = "";
    expect(checkReceiptTotals(printed, edited)).toEqual({ mismatches: [], checked: 2 });
  });

  it("compares nothing when the page has no readable totals block", () => {
    const none = { total_pcs: "", total_box: "", total_items: "", total_value: "" };
    expect(checkReceiptTotals(none, rows())).toEqual({ mismatches: [], checked: 0 });
  });

  it("ignores an empty row the user added but hasn't filled in", () => {
    const withBlank = [
      ...rows(),
      item({ item_code: "", item_name: "", unit_count: "", quantity: "", item_price: "", total_item_price: "" }),
    ];
    expect(checkReceiptTotals(printed, withBlank).mismatches).toEqual([]);
  });
});
