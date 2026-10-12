import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreSession } from "@/lib/store-session-storage";
import { useStoreSignIn } from "./use-store-sign-in";

const { verifyStoreAccess } = vi.hoisted(() => ({ verifyStoreAccess: vi.fn() }));
vi.mock("../lib/api", () => ({ verifyStoreAccess }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function signIn(result: { current: ReturnType<typeof useStoreSignIn> }, code: string, passcode: string) {
  let signedIn = false;
  await act(async () => {
    signedIn = await result.current.signIn(code, passcode);
  });
  return signedIn;
}

describe("useStoreSignIn", () => {
  beforeEach(() => {
    window.localStorage.clear();
    verifyStoreAccess.mockReset();
  });

  it("saves the normalized store and passcode once the backend accepts them", async () => {
    verifyStoreAccess.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useStoreSignIn(), { wrapper });

    expect(await signIn(result, " st01 ", "secret1")).toBe(true);
    expect(verifyStoreAccess).toHaveBeenCalledWith("ST01", "secret1");
    expect(window.localStorage.getItem("osave.store_code")).toBe("ST01");
    expect(window.localStorage.getItem("osave.store_passcode")).toBe("secret1");
    expect(result.current.errorMessage).toBeNull();
  });

  it.each([
    ["wrong_passcode", "Wrong passcode for store ST01."],
    ["store_not_set_up", "Store ST01 hasn't been set up yet. Ask your manager for its passcode."],
    ["too_many_attempts", "Too many wrong passcodes. Wait 15 minutes, then try again."],
    ["network", "Couldn't reach the server. Check your connection and try again."],
  ])("explains a %s refusal and saves nothing", async (problem, message) => {
    verifyStoreAccess.mockResolvedValue({ ok: false, problem });
    const { result } = renderHook(() => useStoreSignIn(), { wrapper });

    expect(await signIn(result, "ST01", "guess")).toBe(false);
    // TanStack Query publishes a mutation's result on a later tick.
    await waitFor(() => expect(result.current.errorMessage).toBe(message));
    expect(window.localStorage.getItem("osave.store_passcode")).toBeNull();
  });

  it("keeps the phone's current sign-in when a different passcode is refused", async () => {
    saveStoreSession("ST01", "secret1");
    verifyStoreAccess.mockResolvedValue({ ok: false, problem: "wrong_passcode" });
    const { result } = renderHook(() => useStoreSignIn(), { wrapper });

    await signIn(result, "ST02", "guess");

    expect(window.localStorage.getItem("osave.store_code")).toBe("ST01");
    expect(window.localStorage.getItem("osave.store_passcode")).toBe("secret1");
  });

  it("continues without a request when the passcode for that store is already saved", async () => {
    saveStoreSession("ST01", "secret1");
    const { result } = renderHook(() => useStoreSignIn(), { wrapper });

    expect(result.current.canReusePasscode("st01")).toBe(true);
    expect(await signIn(result, "st01", "")).toBe(true);
    expect(verifyStoreAccess).not.toHaveBeenCalled();
  });

  it("needs a passcode for any other store", async () => {
    saveStoreSession("ST01", "secret1");
    const { result } = renderHook(() => useStoreSignIn(), { wrapper });

    expect(result.current.canReusePasscode("ST02")).toBe(false);
    expect(await signIn(result, "ST02", "")).toBe(false);
    expect(verifyStoreAccess).not.toHaveBeenCalled();
  });
});
