import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRequireStoreSession } from "./use-require-store-session";
import { useStoreSession } from "./use-store-session";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("useRequireStoreSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it("redirects home when there is no store code", () => {
    renderHook(() => useRequireStoreSession());

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not redirect when a store code is set", () => {
    window.localStorage.setItem("osave.store_code", "ST01");

    const { result } = renderHook(() => useRequireStoreSession());

    expect(replace).not.toHaveBeenCalled();
    expect(result.current).toBe("ST01");
  });

  it("redirects once the store code is cleared", () => {
    window.localStorage.setItem("osave.store_code", "ST01");
    const { result } = renderHook(() => {
      const storeCode = useRequireStoreSession();
      const { clearStoreCode } = useStoreSession();
      return { storeCode, clearStoreCode };
    });

    expect(replace).not.toHaveBeenCalled();

    act(() => result.current.clearStoreCode());

    expect(replace).toHaveBeenCalledWith("/");
  });
});
