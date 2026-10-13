import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  buildResultsSearchParams,
  describeResultsFilters,
  parseResultsSearchParams,
} from "./search-params";

describe("buildResultsSearchParams / parseResultsSearchParams", () => {
  it("round-trips a text-only query", () => {
    const params = buildResultsSearchParams({ query: "cola", range: undefined });
    expect(params.get("q")).toBe("cola");
    expect(params.has("from")).toBe(false);

    const parsed = parseResultsSearchParams(params);
    expect(parsed.query).toBe("cola");
    expect(parsed.range).toBeUndefined();
  });

  it("round-trips a date range", () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 5) };
    const params = buildResultsSearchParams({ query: "", range });

    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-01-05");

    const parsed = parseResultsSearchParams(params);
    expect(parsed.query).toBe("");
    expect(parsed.range?.from && format(parsed.range.from, "yyyy-MM-dd")).toBe("2026-01-01");
    expect(parsed.range?.to && format(parsed.range.to, "yyyy-MM-dd")).toBe("2026-01-05");
  });

  it("defaults a single-day range's `to` to `from` when building", () => {
    const params = buildResultsSearchParams({
      query: "",
      range: { from: new Date(2026, 0, 1), to: undefined },
    });
    expect(params.get("to")).toBe("2026-01-01");
  });

  it("trims and omits an empty query", () => {
    const params = buildResultsSearchParams({ query: "   ", range: undefined });
    expect(params.has("q")).toBe(false);
  });
});

describe("describeResultsFilters", () => {
  it("describes a text-only filter", () => {
    expect(describeResultsFilters("cola", undefined)).toBe("cola");
  });

  it("describes a combined filter", () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 1) };
    expect(describeResultsFilters("cola", range)).toBe("cola · Jan 1");
  });

  it("falls back to a generic label with no filters", () => {
    expect(describeResultsFilters("", undefined)).toBe("All results");
  });
});
