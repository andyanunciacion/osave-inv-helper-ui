import { describe, expect, it } from "vitest";
import type { DraftItem } from "../types";
import { summarizeDraft } from "./draft-summary";

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

// Page 12 of 12 of a real receipt: Total Box 3, Total Value 840.00.
const rows = (): DraftItem[] => [
  item({ item_code: "4271" }),
  item({ item_code: "4272" }),
  item({ item_code: "4272" }),
  item({ item_code: "9005", item_price: "480.00", total_item_price: "480.00" }),
  item({ item_code: "4281", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
  item({ item_code: "4282", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
  item({ item_code: "4287", unit: "BOX", unit_count: "24", item_price: "1.50", total_item_price: "36.00" }),
];

describe("summarizeDraft", () => {
  it("sums Qty over BOX rows and every row's Total", () => {
    expect(summarizeDraft(rows())).toEqual({ totalBox: 3, rowsMissingBox: 0, totalValue: 840, rowsMissingTotal: 0 });
  });

  it("uses the rows as edited, not anything printed", () => {
    const edited = rows();
    edited[4] = { ...edited[4], quantity: "2", total_item_price: "72.00" };
    expect(summarizeDraft(edited)).toMatchObject({ totalBox: 4, totalValue: 876 });
  });

  it("leaves out and counts rows whose Qty, UOM or Total is still blank", () => {
    const partial = rows();
    partial[0] = { ...partial[0], total_item_price: "" };
    partial[4] = { ...partial[4], quantity: "" };
    partial[5] = { ...partial[5], unit: "" };
    expect(summarizeDraft(partial)).toEqual({ totalBox: 1, rowsMissingBox: 2, totalValue: 756, rowsMissingTotal: 1 });
  });

  it("adds money to the cent without float drift", () => {
    const cents = [item({ total_item_price: "0.10" }), item({ total_item_price: "0.20" })];
    expect(summarizeDraft(cents).totalValue).toBe(0.3);
  });
});
