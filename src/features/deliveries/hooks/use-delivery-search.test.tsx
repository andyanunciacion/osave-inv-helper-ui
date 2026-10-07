import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DeliverySearchResultGroup } from "../types";
import { useDeliverySearch } from "./use-delivery-search";

const { fetchGroupedSearch } = vi.hoisted(() => ({ fetchGroupedSearch: vi.fn() }));
vi.mock("../lib/api", () => ({ fetchGroupedSearch }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function group(overrides: Partial<DeliverySearchResultGroup> = {}): DeliverySearchResultGroup {
  return {
    delivery: {
      delivery_code: "INV-1",
      store_code: "STORE1",
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: null,
      uploaded_by: null,
      status: "confirmed",
      created_at: "2026-09-01T00:00:00.000Z",
    },
    items: [],
    displayItems: [],
    autoExpand: false,
    ...overrides,
  };
}

describe("useDeliverySearch", () => {
  it("does not fetch until a query is present, even with a store selected", () => {
    fetchGroupedSearch.mockResolvedValue([]);

    const { result } = renderHook(
      () => useDeliverySearch({ storeCode: "STORE1", query: "", range: undefined }),
      { wrapper },
    );

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.groups).toHaveLength(0);
    expect(result.current.status).toBe("idle");
    expect(fetchGroupedSearch).not.toHaveBeenCalled();
  });

  it("reports loading, not an empty result, while the search is in flight", async () => {
    let resolve: (groups: DeliverySearchResultGroup[]) => void = () => {};
    fetchGroupedSearch.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(
      () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
      { wrapper },
    );

    expect(result.current.status).toBe("loading");
    act(() => resolve([]));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.groups).toHaveLength(0);
  });

  it("reports a failed search as an error, and retry fetches again", async () => {
    fetchGroupedSearch.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(
      () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.status).toBe("error"));

    fetchGroupedSearch.mockResolvedValueOnce([group()]);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.groups).toHaveLength(1);
  });

  it("reports offline, not an empty result, while the search is paused for no connection", async () => {
    fetchGroupedSearch.mockResolvedValue([group()]);
    onlineManager.setOnline(false);
    try {
      const { result } = renderHook(
        () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
        { wrapper },
      );

      expect(result.current.status).toBe("offline");
      expect(fetchGroupedSearch).not.toHaveBeenCalled();

      act(() => onlineManager.setOnline(true));
      await waitFor(() => expect(result.current.status).toBe("success"));
      expect(result.current.groups).toHaveLength(1);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("fetches grouped results for a text query and reports hasActiveFilters", async () => {
    fetchGroupedSearch.mockResolvedValue([group()]);

    const { result } = renderHook(
      () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(result.current.hasActiveFilters).toBe(true);
    expect(fetchGroupedSearch).toHaveBeenCalledWith("STORE1", "cola", undefined);
  });

  it("passes the date range through to the fetch", async () => {
    fetchGroupedSearch.mockResolvedValue([]);
    const range = { from: new Date("2026-01-01"), to: new Date("2026-01-02") };

    renderHook(() => useDeliverySearch({ storeCode: "STORE1", query: "widget", range }), {
      wrapper,
    });

    await waitFor(() => expect(fetchGroupedSearch).toHaveBeenCalled());
    expect(fetchGroupedSearch).toHaveBeenCalledWith("STORE1", "widget", range);
  });
});
