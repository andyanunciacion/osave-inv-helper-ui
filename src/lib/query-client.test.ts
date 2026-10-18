import { QueryClient, type Query } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { makePersistOptions, SAVED_DATA_MAX_AGE_MS } from "./query-client";

const shouldSave = makePersistOptions().dehydrateOptions!.shouldDehydrateQuery!;

function cachedQuery(queryKey: readonly unknown[], { dataUpdatedAt = Date.now(), failed = false } = {}): Query {
  const queryClient = new QueryClient();
  if (failed) {
    const query = queryClient.getQueryCache().build(queryClient, { queryKey });
    query.setState({ status: "error", error: new Error("network down") });
    return query;
  }
  queryClient.setQueryData(queryKey, ["delivery"], { updatedAt: dataUpdatedAt });
  return queryClient.getQueryCache().find({ queryKey })!;
}

describe("makePersistOptions", () => {
  it("saves a delivery read for offline use", () => {
    expect(shouldSave(cachedQuery(["deliveries", "245", "recent", 5]))).toBe(true);
  });

  it("doesn't save a failed read", () => {
    expect(shouldSave(cachedQuery(["deliveries", "245", "recent", 5], { failed: true }))).toBe(false);
  });

  it("doesn't save data older than a week", () => {
    const old = Date.now() - SAVED_DATA_MAX_AGE_MS - 1;
    expect(shouldSave(cachedQuery(["deliveries", "245", "recent", 5], { dataUpdatedAt: old }))).toBe(false);
  });

  it("only saves delivery reads", () => {
    expect(shouldSave(cachedQuery(["something-else"]))).toBe(false);
  });
});
