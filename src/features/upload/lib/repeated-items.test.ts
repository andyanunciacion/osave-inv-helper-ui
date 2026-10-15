import { describe, expect, it } from "vitest";
import type { DraftItem } from "../types";
import {
  describeDifferingFields,
  describeRowRepeat,
  findRepeatedItems,
  repeatedGroupLabel,
} from "./repeated-items";

function row(localId: string, overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    localId,
    item_code: "4272",
    item_name: "Beer Crate Deposit",
    unit_count: "1",
    quantity: "1",
    unit: "PIECE",
    item_price: "84",
    total_item_price: "84",
    inferred: [],
    has_annotation: false,
    ...overrides,
  };
}

describe("findRepeatedItems", () => {
  it("finds nothing when every item code is different", () => {
    expect(findRepeatedItems([row("a"), row("b", { item_code: "4295" })])).toEqual([]);
  });

  it("groups rows with the same item code, in draft order", () => {
    const groups = findRepeatedItems([row("a"), row("b", { item_code: "4295" }), row("c", { quantity: "3" })]);
    expect(groups).toEqual([
      { label: "4272", matchedBy: "item_code", localIds: ["a", "c"], differingFields: [] },
    ]);
  });

  it("ignores surrounding spaces in the code, as confirm trims it", () => {
    expect(findRepeatedItems([row("a"), row("b", { item_code: " 4272 " })])).toHaveLength(1);
  });

  it("matches codeless rows by description, ignoring case and spaces", () => {
    const groups = findRepeatedItems([
      row("a", { item_code: "", item_name: "Ice Bag" }),
      row("b", { item_code: " ", item_name: " ice bag " }),
    ]);
    expect(groups).toEqual([
      { label: "Ice Bag", matchedBy: "item_name", localIds: ["a", "b"], differingFields: [] },
    ]);
  });

  it("doesn't match a codeless row to a coded row with the same description", () => {
    expect(findRepeatedItems([row("a"), row("b", { item_code: "" })])).toEqual([]);
  });

  it("skips rows with no description — they aren't sent", () => {
    expect(findRepeatedItems([row("a", { item_name: "" }), row("b", { item_name: " " })])).toEqual([]);
  });

  it("lists the fields that differ from the first row", () => {
    const [group] = findRepeatedItems([
      row("a"),
      row("b", { item_price: "90", unit: "BOX" }),
      row("c", { item_name: "Something Else" }),
    ]);
    expect(group.differingFields).toEqual(["item_name", "unit", "item_price"]);
  });

  it("compares numbers as numbers and names case-insensitively", () => {
    const [group] = findRepeatedItems([
      row("a"),
      row("b", { item_price: "84.00", unit_count: " 1 ", item_name: "BEER CRATE DEPOSIT" }),
    ]);
    expect(group.differingFields).toEqual([]);
  });

  it("doesn't count a differing quantity or total — those are added together", () => {
    const [group] = findRepeatedItems([row("a"), row("b", { quantity: "5", total_item_price: "420" })]);
    expect(group.differingFields).toEqual([]);
  });
});

describe("describeDifferingFields", () => {
  it("joins field labels into a sentence", () => {
    expect(describeDifferingFields(["item_price"])).toBe("Price differs");
    expect(describeDifferingFields(["unit", "item_price"])).toBe("UOM and Price differ");
    expect(describeDifferingFields(["item_name", "unit", "item_price"])).toBe("Description, UOM and Price differ");
  });
});

describe("describeRowRepeat", () => {
  it("explains a clean repeat", () => {
    expect(describeRowRepeat({ matchedBy: "item_code", differingFields: [], otherRows: 1 })).toBe(
      "Same item code as 1 other row — saved as one row, with Qty and Total added together.",
    );
  });

  it("points at the code when the repeats disagree", () => {
    expect(describeRowRepeat({ matchedBy: "item_code", differingFields: ["item_price"], otherRows: 2 })).toBe(
      "Same item code as 2 other rows, but Price differs — check the code against the receipt.",
    );
  });

  it("points at the description for codeless rows", () => {
    expect(describeRowRepeat({ matchedBy: "item_name", differingFields: ["unit"], otherRows: 1 })).toBe(
      "Same description as 1 other row, but UOM differs — check the description against the receipt.",
    );
  });
});

describe("repeatedGroupLabel", () => {
  it("names the item and how many rows it's on", () => {
    const [group] = findRepeatedItems([row("a"), row("b"), row("c")]);
    expect(repeatedGroupLabel(group)).toBe("4272 (3 rows)");
  });
});
