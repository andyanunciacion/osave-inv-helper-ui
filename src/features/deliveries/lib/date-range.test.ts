import { describe, expect, it } from "vitest";
import { isDateWithinRange } from "./date-range";

describe("isDateWithinRange", () => {
  it("is true when no range is set", () => {
    expect(isDateWithinRange("2026-01-15", undefined)).toBe(true);
  });

  it("is true for a date within a range", () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
    expect(isDateWithinRange("2026-01-15", range)).toBe(true);
  });

  it("is true for a date exactly on the range boundary", () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
    expect(isDateWithinRange("2026-01-01", range)).toBe(true);
    expect(isDateWithinRange("2026-01-31", range)).toBe(true);
  });

  it("is false for a date outside the range", () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
    expect(isDateWithinRange("2026-02-01", range)).toBe(false);
  });

  it("treats a single-day range (no `to`) as that one day", () => {
    const range = { from: new Date(2026, 0, 15), to: undefined };
    expect(isDateWithinRange("2026-01-15", range)).toBe(true);
    expect(isDateWithinRange("2026-01-16", range)).toBe(false);
  });
});
