import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useItemHistory } from "./use-item-history";

const { fetchItemHistory } = vi.hoisted(() => ({ fetchItemHistory: vi.fn() }));
vi.mock("../lib/api", () => ({ fetchItemHistory }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useItemHistory", () => {
  beforeEach(() => {
    fetchItemHistory.mockReset();
  });

  it("is a real empty history only once the request came back empty", async () => {
    fetchItemHistory.mockResolvedValue([]);
    const { result } = renderHook(() => useItemHistory("INV-1", "item-1", true), { wrapper });

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.history).toEqual([]);
  });

  it("is offline, not empty, when it was never fetched on this phone", async () => {
    fetchItemHistory.mockResolvedValue([]);
    onlineManager.setOnline(false);
    try {
      const { result } = renderHook(() => useItemHistory("INV-1", "item-1", true), { wrapper });

      expect(result.current.status).toBe("offline");
      expect(fetchItemHistory).not.toHaveBeenCalled();

      act(() => onlineManager.setOnline(true));
      await waitFor(() => expect(result.current.status).toBe("success"));
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("is an error, not empty, when the request failed", async () => {
    fetchItemHistory.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useItemHistory("INV-1", "item-1", true), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
