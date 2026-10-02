import { describe, expect, it } from "vitest";
import { toQueryStatus } from "./query-status";

describe("toQueryStatus", () => {
  it("is idle for a query that isn't running (no filters yet)", () => {
    expect(toQueryStatus({ data: undefined, isError: false, isLoading: false })).toBe("idle");
  });

  it("is loading while the first fetch is in flight", () => {
    expect(toQueryStatus({ data: undefined, isError: false, isLoading: true })).toBe("loading");
  });

  it("is error when the fetch failed and nothing is on screen", () => {
    expect(toQueryStatus({ data: undefined, isError: true, isLoading: false })).toBe("error");
  });

  it("is success for an empty result — a real \"nothing found\"", () => {
    expect(toQueryStatus({ data: [], isError: false, isLoading: false })).toBe("success");
  });

  it("keeps results on screen when a later background refetch fails", () => {
    expect(toQueryStatus({ data: [1], isError: true, isLoading: false })).toBe("success");
  });
});
