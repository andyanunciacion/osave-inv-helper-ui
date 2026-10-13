import { describe, expect, it } from "vitest";
import { toQueryStatus } from "./query-status";

const base = { data: undefined, isError: false, isLoading: false, isPaused: false };

describe("toQueryStatus", () => {
  it("is idle for a query that isn't running (no filters yet)", () => {
    expect(toQueryStatus(base)).toBe("idle");
  });

  it("is loading while the first fetch is in flight", () => {
    expect(toQueryStatus({ ...base, isLoading: true })).toBe("loading");
  });

  it("is offline when the fetch is paused (no network, or a retry waiting for the page)", () => {
    expect(toQueryStatus({ ...base, isPaused: true })).toBe("offline");
  });

  it("is error when the fetch failed and nothing is on screen", () => {
    expect(toQueryStatus({ ...base, isError: true })).toBe("error");
  });

  it("is success for an empty result — a real \"nothing found\"", () => {
    expect(toQueryStatus({ ...base, data: [] })).toBe("success");
  });

  it("keeps results on screen when a later background refetch fails", () => {
    expect(toQueryStatus({ ...base, data: [1], isError: true })).toBe("success");
  });

  it("keeps results on screen while a background refetch is paused", () => {
    expect(toQueryStatus({ ...base, data: [1], isPaused: true })).toBe("success");
  });
});
