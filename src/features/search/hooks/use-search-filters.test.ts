import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeQuickRange, useSearchFilters } from "./use-search-filters";

// Fixed reference point: Wed 2026-09-16 12:00 local time.
const REFERENCE_DATE = new Date(2026, 8, 16, 12, 0, 0);

describe("computeQuickRange", () => {
  it("resolves yesterday to a single-day range", () => {
    const { from, to } = computeQuickRange("yesterday", REFERENCE_DATE);

    expect(from?.getDate()).toBe(15);
    expect(to?.getDate()).toBe(15);
  });

  it("resolves last-3-days to a 3-day window ending today", () => {
    const { from, to } = computeQuickRange("last-3-days", REFERENCE_DATE);

    expect(from?.getDate()).toBe(14);
    expect(to?.getDate()).toBe(16);
  });

  it("resolves last-7-days to a 7-day window ending today", () => {
    const { from, to } = computeQuickRange("last-7-days", REFERENCE_DATE);

    expect(from?.getDate()).toBe(10);
    expect(to?.getDate()).toBe(16);
  });

  it("resolves last-30-days to a 30-day window ending today", () => {
    const { from, to } = computeQuickRange("last-30-days", REFERENCE_DATE);

    expect(from?.getMonth()).toBe(7); // August
    expect(from?.getDate()).toBe(18);
    expect(to?.getDate()).toBe(16);
  });

  it("resolves last-month to the full previous calendar month", () => {
    const { from, to } = computeQuickRange("last-month", REFERENCE_DATE);

    expect(from?.getMonth()).toBe(7); // August
    expect(from?.getDate()).toBe(1);
    expect(to?.getMonth()).toBe(7);
    expect(to?.getDate()).toBe(31);
  });
});

describe("useSearchFilters", () => {
  it("applies a quick range and marks it active", () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => result.current.selectQuickRange("last-7-days"));

    expect(result.current.activeQuickRange).toBe("last-7-days");
    expect(result.current.range).toBeDefined();
  });

  it("deselects a quick range when clicked again", () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => result.current.selectQuickRange("yesterday"));
    act(() => result.current.selectQuickRange("yesterday"));

    expect(result.current.activeQuickRange).toBeNull();
    expect(result.current.range).toBeUndefined();
  });

  it("switching quick ranges replaces the previous selection", () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => result.current.selectQuickRange("yesterday"));
    act(() => result.current.selectQuickRange("last-30-days"));

    expect(result.current.activeQuickRange).toBe("last-30-days");
  });

  it("clears the active quick range when a manual range is set", () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => result.current.selectQuickRange("last-3-days"));
    act(() =>
      result.current.setRange({ from: new Date(2026, 0, 1), to: new Date(2026, 0, 5) }),
    );

    expect(result.current.activeQuickRange).toBeNull();
    expect(result.current.range?.from).toEqual(new Date(2026, 0, 1));
  });

  it("clearRange resets both range and active quick range", () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => result.current.selectQuickRange("last-month"));
    act(() => result.current.clearRange());

    expect(result.current.range).toBeUndefined();
    expect(result.current.activeQuickRange).toBeNull();
  });
});
