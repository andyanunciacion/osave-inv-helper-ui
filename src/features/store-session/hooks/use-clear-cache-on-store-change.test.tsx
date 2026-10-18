import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { clearStoreSession, forgetStorePasscode, saveStoreSession } from "@/lib/store-session-storage";
import { useClearCacheOnStoreChange } from "./use-clear-cache-on-store-change";

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  renderHook(() => useClearCacheOnStoreChange(), { wrapper });
  return queryClient;
}

const cachedRecent = (queryClient: QueryClient, storeCode: string) =>
  queryClient.getQueryData(["deliveries", storeCode, "recent", 5]);

describe("useClearCacheOnStoreChange", () => {
  afterEach(() => {
    clearStoreSession();
  });

  it("drops the previous store's deliveries when another store signs in", () => {
    saveStoreSession("245", "test-passcode");
    const queryClient = setup();
    queryClient.setQueryData(["deliveries", "245", "recent", 5], ["store 245 delivery"]);

    act(() => saveStoreSession("246", "other-passcode"));

    expect(cachedRecent(queryClient, "245")).toBeUndefined();
  });

  it("keeps the store's deliveries when its passcode is re-entered", () => {
    saveStoreSession("245", "test-passcode");
    const queryClient = setup();
    queryClient.setQueryData(["deliveries", "245", "recent", 5], ["store 245 delivery"]);

    act(() => forgetStorePasscode());
    act(() => saveStoreSession("245", "test-passcode"));

    expect(cachedRecent(queryClient, "245")).toEqual(["store 245 delivery"]);
  });

  it("keeps data restored for the store that was already signed in", () => {
    saveStoreSession("245", "test-passcode");
    const queryClient = setup();
    queryClient.setQueryData(["deliveries", "245", "recent", 5], ["store 245 delivery"]);

    expect(cachedRecent(queryClient, "245")).toEqual(["store 245 delivery"]);
  });
});
