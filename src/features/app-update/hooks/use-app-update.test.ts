import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppUpdate } from "./use-app-update";

// A stand-in for @serwist/window's Serwist: an event target with the one
// method the hook calls.
class FakeSerwist extends EventTarget {
  messageSkipWaiting = vi.fn();
}

let serwist: FakeSerwist | null;

vi.mock("@serwist/turbopack/react", () => ({
  useSerwist: () => ({ serwist }),
}));

describe("useAppUpdate", () => {
  const reload = vi.fn();

  beforeEach(() => {
    serwist = new FakeSerwist();
    vi.stubGlobal("location", { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    reload.mockReset();
  });

  it("shows nothing until a new version is waiting", () => {
    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.updateReady).toBe(false);
  });

  it("is ready once a new version is waiting", () => {
    const { result } = renderHook(() => useAppUpdate());

    act(() => {
      serwist!.dispatchEvent(new Event("waiting"));
    });

    expect(result.current.updateReady).toBe(true);
  });

  it("tells the waiting version to take over, and reloads only once it has", () => {
    const { result } = renderHook(() => useAppUpdate());
    act(() => {
      serwist!.dispatchEvent(new Event("waiting"));
    });

    act(() => result.current.reload());

    expect(serwist!.messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    serwist!.dispatchEvent(new Event("controlling"));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("hides the banner when dismissed", () => {
    const { result } = renderHook(() => useAppUpdate());
    act(() => {
      serwist!.dispatchEvent(new Event("waiting"));
    });

    act(() => result.current.dismiss());

    expect(result.current.updateReady).toBe(false);
  });

  it("does nothing where service workers aren't available", () => {
    serwist = null;
    const { result } = renderHook(() => useAppUpdate());

    act(() => result.current.reload());

    expect(result.current.updateReady).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
