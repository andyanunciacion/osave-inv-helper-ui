import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIos } from "../lib/install-prompt-store";
import { useInstallPrompt } from "./use-install-prompt";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

function fireBeforeInstallPrompt() {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

function setUserAgent(userAgent: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
}

function setStandalone(standalone: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: standalone }) as unknown as typeof window.matchMedia;
}

describe("useInstallPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUserAgent(ANDROID_UA);
    setStandalone(false);
    // Drop any prompt a previous test left in the module.
    window.dispatchEvent(new Event("appinstalled"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows nothing until Chrome offers a prompt", () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.tip).toBeNull();
  });

  it("offers an install button once Chrome hands over its prompt, replacing Chrome's own banner", () => {
    const { result } = renderHook(() => useInstallPrompt());

    const event = fireBeforeInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.tip).toBe("install-button");
  });

  it("opens Chrome's prompt once and hides the tip", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = fireBeforeInstallPrompt();

    await act(() => result.current.install());

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.tip).toBeNull();
  });

  it("keeps a prompt that fired before any tip was mounted", () => {
    fireBeforeInstallPrompt();

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.tip).toBe("install-button");
  });

  it("hides the tip once the app is installed", () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current.tip).toBeNull();
  });

  it("shows Add to Home Screen steps on an iPhone", () => {
    setUserAgent(IPHONE_UA);

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.tip).toBe("ios-steps");
  });

  it("shows nothing when already running as the installed app", () => {
    setUserAgent(IPHONE_UA);
    setStandalone(true);

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.tip).toBeNull();
  });

  it("remembers a dismissal and leaves Chrome's own install UI alone after it", () => {
    setUserAgent(IPHONE_UA);
    const { result, unmount } = renderHook(() => useInstallPrompt());

    act(() => result.current.dismiss());
    expect(result.current.tip).toBeNull();
    unmount();

    const event = fireBeforeInstallPrompt();
    const { result: later } = renderHook(() => useInstallPrompt());

    expect(event.defaultPrevented).toBe(false);
    expect(later.current.tip).toBeNull();
  });
});

describe("isIos", () => {
  it("treats an iPad (which reports a Mac) as iOS by its touch support", () => {
    expect(isIos({ userAgent: IPAD_UA, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: IPAD_UA, maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: ANDROID_UA, maxTouchPoints: 5 })).toBe(false);
  });
});
