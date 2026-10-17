import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreSession } from "@/lib/store-session-storage";
import { useSignOut } from "./use-sign-out";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("useSignOut", () => {
  let queryClient: QueryClient;

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    window.localStorage.clear();
    replace.mockReset();
    queryClient = new QueryClient();
  });

  it("forgets the store code and passcode and goes to the store screen", () => {
    saveStoreSession("ST01", "secret1");
    const { result } = renderHook(() => useSignOut(), { wrapper });

    act(() => result.current.signOut());

    expect(window.localStorage.getItem("osave.store_code")).toBeNull();
    expect(window.localStorage.getItem("osave.store_passcode")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("drops the signed-out store's cached deliveries", () => {
    saveStoreSession("ST01", "secret1");
    queryClient.setQueryData(["deliveries", "ST01"], [{ id: "d1" }]);
    const { result } = renderHook(() => useSignOut(), { wrapper });

    act(() => result.current.signOut());

    expect(queryClient.getQueryData(["deliveries", "ST01"])).toBeUndefined();
  });
});
