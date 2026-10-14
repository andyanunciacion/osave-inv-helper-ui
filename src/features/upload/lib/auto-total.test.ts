import { describe, expect, it } from "vitest";
import type { DraftItem } from "../types";
import { withAutoTotal } from "./auto-total";

function item(overrides: Partial<DraftItem>): DraftItem {
  return {
    localId: "a",
    item_code: "3580",
    item_name: "Potato Fries Cheese Flavor Snaffle 50g",
    unit_count: "25",
    quantity: "1",
    unit: "BOX",
    item_price: "13.00",
    total_item_price: "",
    inferred: [],
    has_annotation: false,
    ...overrides,
  };
}

describe("withAutoTotal", () => {
  it("fills a blank Total from Qty × Unit/Box × Price and marks it calculated", () => {
    const out = withAutoTotal(item({}));
    expect(out.total_item_price).toBe("325.00");
    expect(out.inferred).toEqual(["total_item_price"]);
  });

  it("recomputes a calculated Total when its inputs change", () => {
    const out = withAutoTotal(item({ quantity: "2", total_item_price: "325.00", inferred: ["total_item_price"] }));
    expect(out.total_item_price).toBe("650.00");
    expect(out.inferred).toEqual(["total_item_price"]);
  });

  it("never touches a Total that was read off the receipt or typed", () => {
    const printed = item({ quantity: "2", total_item_price: "325.00" });
    expect(withAutoTotal(printed)).toBe(printed);
  });

  it("leaves a blank Total blank until Qty, Unit/Box and Price are all filled", () => {
    const partial = item({ item_price: "" });
    expect(withAutoTotal(partial)).toBe(partial);
  });

  it("clears a calculated Total when one of its inputs is cleared", () => {
    const out = withAutoTotal(item({ item_price: "", total_item_price: "325.00", inferred: ["quantity", "total_item_price"] }));
    expect(out.total_item_price).toBe("");
    expect(out.inferred).toEqual(["quantity"]);
  });

  it("rounds to cents", () => {
    expect(withAutoTotal(item({ unit_count: "3", item_price: "0.1" })).total_item_price).toBe("0.30");
    expect(withAutoTotal(item({ unit_count: "12", item_price: "52.31" })).total_item_price).toBe("627.72");
  });
});
