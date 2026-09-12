import { describe, expect, it } from "vitest";
import { formatItemLabel, hasPriceMismatch } from "./format";

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

describe("hasPriceMismatch", () => {
  it("is false when quantity * item_price matches the printed total", () => {
    expect(hasPriceMismatch(2, 10, 20)).toBe(false);
  });

  it("is false within rounding tolerance", () => {
    expect(hasPriceMismatch(3, 9.995, 30)).toBe(false);
  });

  it("is true when the printed total diverges meaningfully", () => {
    expect(hasPriceMismatch(2, 10, 35)).toBe(true);
  });

  it("is false when any field is missing (nothing to compare)", () => {
    expect(hasPriceMismatch(null, 10, 20)).toBe(false);
    expect(hasPriceMismatch(2, null, 20)).toBe(false);
    expect(hasPriceMismatch(2, 10, null)).toBe(false);
  });
});
