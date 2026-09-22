import { describe, expect, it } from "vitest";
import { formatItemLabel, formatQuantity, hasPriceMismatch } from "./format";

describe("formatItemLabel", () => {
  it("puts the item code before the item name", () => {
    expect(formatItemLabel("SAN-1074", "Laundry Detergent 1kg")).toBe(
      "SAN-1074 Laundry Detergent 1kg",
    );
  });

  it("falls back to just the name when there's no code", () => {
    expect(formatItemLabel(null, "Assorted Candy")).toBe("Assorted Candy");
  });
});

describe("formatQuantity", () => {
  it("shows the amount with its unit and the per-box count for boxes", () => {
    expect(formatQuantity(2, "BOX", 12)).toBe("2 BOX · 12/box");
  });

  it("omits the per-box count for PIECE rows", () => {
    expect(formatQuantity(3, "PIECE", 1)).toBe("3 PIECE");
  });

  it("still shows what it has when one half wasn't read", () => {
    expect(formatQuantity(null, "BOX", 12)).toBe("12/box");
    expect(formatQuantity(2, "BOX", null)).toBe("2 BOX");
  });

  it("falls back to a dash when neither is known", () => {
    expect(formatQuantity(null, null, null)).toBe("—");
    expect(formatQuantity(null, "BOX")).toBe("—");
  });
});

describe("hasPriceMismatch", () => {
  it("is false when quantity * unit_count * item_price matches the printed total", () => {
    expect(hasPriceMismatch(2, 12, 10, 240)).toBe(false);
    expect(hasPriceMismatch(1, 96, 18.5, 1776)).toBe(false);
  });

  it("is false within rounding tolerance", () => {
    expect(hasPriceMismatch(3, 1, 9.995, 30)).toBe(false);
  });

  it("is true when the printed total diverges meaningfully", () => {
    expect(hasPriceMismatch(2, 12, 10, 35)).toBe(true);
  });

  it("is true when Unit/Box is ignored (the old quantity * price formula)", () => {
    expect(hasPriceMismatch(1, 12, 52.31, 52.31)).toBe(true);
  });

  it("is false when any field is missing (nothing to compare)", () => {
    expect(hasPriceMismatch(null, 12, 10, 120)).toBe(false);
    expect(hasPriceMismatch(2, null, 10, 20)).toBe(false);
    expect(hasPriceMismatch(2, 12, null, 240)).toBe(false);
    expect(hasPriceMismatch(2, 12, 10, null)).toBe(false);
  });
});
