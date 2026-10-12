import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { forgetStorePasscode, saveStoreSession } from "@/lib/store-session-storage";
import { useStoreSession } from "./use-store-session";

describe("useStoreSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads an existing store code and whether it has a passcode", () => {
    window.localStorage.setItem("osave.store_code", "ST01");
    window.localStorage.setItem("osave.store_passcode", "secret1");
    const { result } = renderHook(() => useStoreSession());

    expect(result.current.storeCode).toBe("ST01");
    expect(result.current.hasPasscode).toBe(true);
  });

  it("updates when a sign-in is saved, normalizing the code", () => {
    const { result } = renderHook(() => useStoreSession());

    act(() => saveStoreSession(" st02 ", "secret2"));

    expect(result.current.storeCode).toBe("ST02");
    expect(result.current.hasPasscode).toBe(true);
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST02");
  });

  it("drops the passcode when a different store is chosen, keeps it for the same one", () => {
    act(() => saveStoreSession("ST01", "secret1"));
    const { result } = renderHook(() => useStoreSession());

    act(() => result.current.chooseStore("st01"));
    expect(result.current.hasPasscode).toBe(true);

    act(() => result.current.chooseStore("ST09"));
    expect(result.current.storeCode).toBe("ST09");
    expect(result.current.hasPasscode).toBe(false);
  });

  it("keeps the store code when a refused passcode is forgotten", () => {
    act(() => saveStoreSession("ST01", "secret1"));
    const { result } = renderHook(() => useStoreSession());

    act(() => forgetStorePasscode());

    expect(result.current.storeCode).toBe("ST01");
    expect(result.current.hasPasscode).toBe(false);
  });

  it("clears the store code and passcode", () => {
    act(() => saveStoreSession("ST03", "secret3"));
    const { result } = renderHook(() => useStoreSession());

    act(() => result.current.clearStoreCode());

    expect(result.current.storeCode).toBeNull();
    expect(result.current.hasPasscode).toBe(false);
    expect(window.localStorage.getItem("osave.store_passcode")).toBeNull();
  });
});
