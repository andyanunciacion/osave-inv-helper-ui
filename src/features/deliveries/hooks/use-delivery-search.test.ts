import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDelivery } from "../lib/sample-store";
import { useDeliverySearch } from "./use-delivery-search";

// Each test uses its own store_code so seeding + writes in one test can't
// leak into another via the shared in-memory sample store.

describe("useDeliverySearch", () => {
  it("returns no groups until a filter is active, even with matching store data", () => {
    const storeCode = "SEARCH-TEST-NOFILTER";
    createDelivery({
      delivery_code: "INV-NF-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "X1", item_name: "Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "", range: undefined }),
    );

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.groups).toHaveLength(0);
  });

  it("matches query against item_name, item_code, and delivery_code", () => {
    const storeCode = "SEARCH-TEST-QUERY";
    createDelivery({
      delivery_code: "INV-Q-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "COKE-1", item_name: "Cola 1L", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const byItemName = renderHook(() =>
      useDeliverySearch({ storeCode, query: "cola", range: undefined }),
    );
    expect(byItemName.result.current.groups).toHaveLength(1);

    const byDeliveryCode = renderHook(() =>
      useDeliverySearch({ storeCode, query: "INV-Q-1", range: undefined }),
    );
    expect(byDeliveryCode.result.current.groups).toHaveLength(1);

    const noMatch = renderHook(() =>
      useDeliverySearch({ storeCode, query: "nonexistent", range: undefined }),
    );
    expect(noMatch.result.current.groups).toHaveLength(0);
  });

  it("filters by delivery_date range", () => {
    const storeCode = "SEARCH-TEST-RANGE";
    createDelivery({
      delivery_code: "INV-R-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-01-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "X1", item_name: "Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const inRange = renderHook(() =>
      useDeliverySearch({
        storeCode,
        query: "",
        range: { from: new Date("2026-01-01"), to: new Date("2026-01-02") },
      }),
    );
    expect(inRange.result.current.groups).toHaveLength(1);

    const outOfRange = renderHook(() =>
      useDeliverySearch({
        storeCode,
        query: "",
        range: { from: new Date("2026-02-01"), to: new Date("2026-02-02") },
      }),
    );
    expect(outOfRange.result.current.groups).toHaveLength(0);
  });

  it("auto-expands and shows every item on an exact delivery_code match", () => {
    const storeCode = "SEARCH-TEST-EXACT-DELIVERY";
    createDelivery({
      delivery_code: "INV-EXACT-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [
        { item_code: "A1", item_name: "Apples", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "B1", item_name: "Bananas", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "INV-EXACT-1", range: undefined }),
    );

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].autoExpand).toBe(true);
    expect(result.current.groups[0].displayItems).toHaveLength(2);
  });

  it("does not auto-expand on a partial delivery_code match, but still shows every item", () => {
    const storeCode = "SEARCH-TEST-PARTIAL-DELIVERY";
    createDelivery({
      delivery_code: "INV-PARTIAL-99",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [
        { item_code: "A1", item_name: "Apples", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "B1", item_name: "Bananas", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "PARTIAL", range: undefined }),
    );

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].autoExpand).toBe(false);
    expect(result.current.groups[0].displayItems).toHaveLength(2);
  });

  it("filters displayItems down to just the matching item when the query hits an item, not the delivery_code", () => {
    const storeCode = "SEARCH-TEST-ITEM-FILTER";
    createDelivery({
      delivery_code: "INV-ITEMFILTER-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [
        { item_code: "SAN-1", item_name: "Apples", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "SAN-2", item_name: "Bananas", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "SAN-3", item_name: "Cherries", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "SAN-2", range: undefined }),
    );

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].autoExpand).toBe(false);
    expect(result.current.groups[0].displayItems).toHaveLength(1);
    expect(result.current.groups[0].displayItems[0].item_code).toBe("SAN-2");
  });

  it("shows one collapsed group per delivery when an item code matches across multiple deliveries", () => {
    const storeCode = "SEARCH-TEST-ITEM-MULTI";
    createDelivery({
      delivery_code: "INV-MULTI-A",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "SHARED-1", item_name: "Shared Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });
    createDelivery({
      delivery_code: "INV-MULTI-B",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-02",
      receipt_store_code: storeCode,
      items: [{ item_code: "SHARED-1", item_name: "Shared Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "SHARED-1", range: undefined }),
    );

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups.every((group) => group.autoExpand === false)).toBe(true);
    expect(result.current.groups.every((group) => group.displayItems.length === 1)).toBe(true);
  });

  it("always sorts displayItems by item_code, with no-code items first", () => {
    const storeCode = "SEARCH-TEST-SORT";
    createDelivery({
      delivery_code: "INV-SORT-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: storeCode,
      items: [
        { item_code: "SAN-10", item_name: "Ten", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: null, item_name: "No Code", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "SAN-2", item_name: "Two", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });

    const { result } = renderHook(() =>
      useDeliverySearch({ storeCode, query: "INV-SORT-1", range: undefined }),
    );

    expect(result.current.groups[0].displayItems.map((item) => item.item_code)).toEqual([
      null,
      "SAN-2",
      "SAN-10",
    ]);
  });
});
