import { IsRestoringProvider, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
      note: null,
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
  it("does not fetch without a query or date range, even with a store selected", () => {
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

  it("shows the saved copy offline, with when it was fetched", async () => {
    fetchGroupedSearch.mockResolvedValue([group()]);
    try {
      const { result } = renderHook(
        () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.status).toBe("success"));
      expect(result.current.savedAt).toBeNull();

      act(() => onlineManager.setOnline(false));

      expect(result.current.status).toBe("success");
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.savedAt).toEqual(expect.any(Number));
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("reports loading, not \"No deliveries found\", while the saved copy is read back", () => {
    fetchGroupedSearch.mockResolvedValue([group()]);
    const restoringWrapper = ({ children }: { children: ReactNode }) =>
      wrapper({ children: <IsRestoringProvider value={true}>{children}</IsRestoringProvider> });

    const { result } = renderHook(
      () => useDeliverySearch({ storeCode: "STORE1", query: "cola", range: undefined }),
      { wrapper: restoringWrapper },
    );

    expect(result.current.status).toBe("loading");
    expect(fetchGroupedSearch).not.toHaveBeenCalled();
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

  it("fetches grouped results for a date-only search", async () => {
    fetchGroupedSearch.mockResolvedValue([group(), group({ delivery: { ...group().delivery, delivery_code: "INV-2" } })]);
    const range = { from: new Date(2026, 8, 1), to: new Date(2026, 8, 30) };

    const { result } = renderHook(() => useDeliverySearch({ storeCode: "STORE1", query: "", range }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    expect(result.current.hasActiveFilters).toBe(true);
    expect(fetchGroupedSearch).toHaveBeenCalledWith("STORE1", "", range);
  });
});
