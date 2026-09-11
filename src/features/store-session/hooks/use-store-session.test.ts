import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStoreSession } from "./use-store-session";

describe("useStoreSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads an existing store code from localStorage", () => {
    window.localStorage.setItem("osave.store_code", "ST01");
    const { result } = renderHook(() => useStoreSession());

    expect(result.current.storeCode).toBe("ST01");
  });

  it("normalizes and persists a new store code", () => {
    const { result } = renderHook(() => useStoreSession());

    act(() => result.current.setStoreCode(" st02 "));

    expect(result.current.storeCode).toBe("ST02");
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST02");
  });

  it("clears the stored code", () => {
    const { result } = renderHook(() => useStoreSession());

    act(() => result.current.setStoreCode("ST03"));
    act(() => result.current.clearStoreCode());

    expect(result.current.storeCode).toBeNull();
    expect(window.localStorage.getItem("osave.store_code")).toBeNull();
  });
});
