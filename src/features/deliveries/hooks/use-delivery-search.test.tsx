import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
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
});
