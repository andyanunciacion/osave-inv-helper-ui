import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreSession } from "@/lib/store-session-storage";
import { readQrSignInProblem, setQrSignInProblem } from "../lib/qr-sign-in-problem";
import { useQrSignIn, type QrSignInOutcome } from "./use-qr-sign-in";

const { verifyStoreAccess } = vi.hoisted(() => ({ verifyStoreAccess: vi.fn() }));
vi.mock("../lib/api", () => ({ verifyStoreAccess }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function scan(result: { current: ReturnType<typeof useQrSignIn> }, raw: string) {
  let outcome: QrSignInOutcome | undefined;
  await act(async () => {
    outcome = await result.current.signInWithQr(raw);
  });
  return outcome;
}

describe("useQrSignIn", () => {
  beforeEach(() => {
    window.localStorage.clear();
    verifyStoreAccess.mockReset();
    setQrSignInProblem(null);
  });

  it("signs in with the store code and passcode from a sign-in QR code", async () => {
    verifyStoreAccess.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    expect(await scan(result, '{"store_code":"st01","passcode":"secret1"}')).toBe("signed-in");
    expect(verifyStoreAccess).toHaveBeenCalledWith("ST01", "secret1");
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST01");
    expect(window.localStorage.getItem("osave.store_passcode")).toBe("secret1");
    expect(readQrSignInProblem()).toBeNull();
  });

  it("picks the store and hands the refusal to the store screen when the passcode is refused", async () => {
    saveStoreSession("ST01", "secret1");
    verifyStoreAccess.mockResolvedValue({ ok: false, problem: "wrong_passcode" });
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    expect(await scan(result, '{"store_code":"ST02","passcode":"old-one"}')).toBe("needs-passcode");
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST02");
    // Never sent with another store's code.
    expect(window.localStorage.getItem("osave.store_passcode")).toBeNull();
    expect(readQrSignInProblem()).toBe("Wrong passcode for store ST02.");
  });

  it("keeps this phone's saved passcode when its own store's QR code is refused", async () => {
    saveStoreSession("ST01", "secret1");
    verifyStoreAccess.mockResolvedValue({ ok: false, problem: "network" });
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    expect(await scan(result, '{"store_code":"ST01","passcode":"secret1"}')).toBe("needs-passcode");
    expect(window.localStorage.getItem("osave.store_passcode")).toBe("secret1");
    expect(readQrSignInProblem()).toMatch(/couldn't reach the server/i);
  });

  it("picks the store from an older QR code without asking the backend", async () => {
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    expect(await scan(result, "st03")).toBe("needs-passcode");
    expect(verifyStoreAccess).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST03");
    expect(readQrSignInProblem()).toBeNull();
  });

  it("explains a QR code that isn't a store's, and changes nothing", async () => {
    saveStoreSession("ST01", "secret1");
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    expect(await scan(result, '{"url":"https://example.com"}')).toBe("unreadable");
    expect(result.current.errorMessage).toMatch(/isn't a store qr code/i);
    expect(verifyStoreAccess).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST01");
    expect(window.localStorage.getItem("osave.store_passcode")).toBe("secret1");
  });

  it("clears an earlier scan's problems on the next scan", async () => {
    verifyStoreAccess.mockResolvedValue({ ok: true });
    setQrSignInProblem("Wrong passcode for store ST02.");
    const { result } = renderHook(() => useQrSignIn(), { wrapper });

    await scan(result, "{bad");
    expect(result.current.errorMessage).not.toBeNull();

    await scan(result, '{"store_code":"ST02","passcode":"new-one"}');
    expect(result.current.errorMessage).toBeNull();
    expect(readQrSignInProblem()).toBeNull();
  });
});
