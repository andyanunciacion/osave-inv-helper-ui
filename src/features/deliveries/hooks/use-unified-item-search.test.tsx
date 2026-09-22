import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UnifiedItemRow } from "../types";
import { useUnifiedItemSearch } from "./use-unified-item-search";

const { fetchUnifiedSearch } = vi.hoisted(() => ({ fetchUnifiedSearch: vi.fn() }));
vi.mock("../lib/api", () => ({ fetchUnifiedSearch }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function item(overrides: Partial<UnifiedItemRow> = {}): UnifiedItemRow {
  return {
    id: "1",
    delivery_code: "INV-1",
    store_code: "STORE1",
    item_code: "A1",
    item_name: "Widget",
    unit_count: 12,
    quantity: 1,
    unit: "BOX",
    item_price: 1,
    total_item_price: 1,
    raw_ocr_text: null,
    created_at: "2026-02-01T00:00:00.000Z",
    delivery_date: "2026-02-01",
    ...overrides,
  };
}

describe("useUnifiedItemSearch", () => {
  it("does not fetch without a date range", () => {
    fetchUnifiedSearch.mockResolvedValue([]);

    const { result } = renderHook(
      () => useUnifiedItemSearch({ storeCode: "STORE1", range: undefined }),
      { wrapper },
    );

    expect(result.current.items).toHaveLength(0);
    expect(fetchUnifiedSearch).not.toHaveBeenCalled();
  });

  it("fetches the flat item list for a date range", async () => {
    const range = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 1) };
    fetchUnifiedSearch.mockResolvedValue([item(), item({ id: "2", delivery_code: "INV-2" })]);

    const { result } = renderHook(() => useUnifiedItemSearch({ storeCode: "STORE1", range }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(fetchUnifiedSearch).toHaveBeenCalledWith("STORE1", range);
  });
});
