import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { useRequireStoreSession } from "./use-require-store-session";
import { useStoreSession } from "./use-store-session";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function Guarded() {
  const storeCode = useRequireStoreSession();
  return storeCode ? "content" : null;
}

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

  // Regression test for a bug reported on hard navigation/refresh: RTL's
  // renderHook client-renders directly, so it never exercises
  // getServerSnapshot and can't catch a hydration-timing race. This test
  // drives a real SSR (renderToString, no localStorage) -> hydrate
  // (hydrateRoot, with a valid stored code) cycle, matching what a browser
  // does on a hard load, to prove the redirect doesn't fire.
  it("does not redirect on hydration when a store code was already stored", async () => {
    const html = renderToString(<Guarded />);
    expect(html).toBe("");

    window.localStorage.setItem("osave.store_code", "ST01");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    await act(async () => {
      hydrateRoot(container, <Guarded />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(replace).not.toHaveBeenCalled();
    expect(container.textContent).toBe("content");

    container.remove();
  });
});
