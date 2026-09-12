import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDelivery } from "../lib/sample-store";
import { useUnifiedItemSearch } from "./use-unified-item-search";

describe("useUnifiedItemSearch", () => {
  it("returns nothing without a date range", () => {
    const storeCode = "UNIFIED-TEST-NORANGE";
    createDelivery({
      delivery_code: "INV-U-1",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-01-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "A1", item_name: "Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const { result } = renderHook(() => useUnifiedItemSearch({ storeCode, range: undefined }));
    expect(result.current.items).toHaveLength(0);
  });

  it("flattens items across multiple deliveries on the same date into one list", () => {
    const storeCode = "UNIFIED-TEST-FLATTEN";
    createDelivery({
      delivery_code: "INV-U-2A",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-02-01",
      receipt_store_code: storeCode,
      items: [
        { item_code: "A1", item_name: "Apples", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "A2", item_name: "Bananas", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });
    createDelivery({
      delivery_code: "INV-U-2B",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-02-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "C1", item_name: "Cherries", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const { result } = renderHook(() =>
      useUnifiedItemSearch({
        storeCode,
        range: { from: new Date(2026, 1, 1), to: new Date(2026, 1, 1) },
      }),
    );

    expect(result.current.items).toHaveLength(3);
    // Each row carries its own parent delivery_code/date since group headers are gone.
    expect(result.current.items.map((item) => item.delivery_code).sort()).toEqual([
      "INV-U-2A",
      "INV-U-2A",
      "INV-U-2B",
    ]);
    expect(result.current.items.every((item) => item.delivery_date === "2026-02-01")).toBe(true);
  });

  it("sorts by date (most recent first) then item_code, with no-code items first within a date", () => {
    const storeCode = "UNIFIED-TEST-SORT";
    createDelivery({
      delivery_code: "INV-SORT-EARLY",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-04-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "Z1", item_name: "Zebra", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });
    createDelivery({
      delivery_code: "INV-SORT-LATE",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-04-02",
      receipt_store_code: storeCode,
      items: [
        { item_code: "SAN-10", item_name: "Ten", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: null, item_name: "No Code", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
        { item_code: "SAN-2", item_name: "Two", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 },
      ],
    });

    const { result } = renderHook(() =>
      useUnifiedItemSearch({
        storeCode,
        range: { from: new Date(2026, 3, 1), to: new Date(2026, 3, 2) },
      }),
    );

    expect(result.current.items.map((item) => [item.delivery_date, item.item_code])).toEqual([
      ["2026-04-02", null],
      ["2026-04-02", "SAN-2"],
      ["2026-04-02", "SAN-10"],
      ["2026-04-01", "Z1"],
    ]);
  });

  it("excludes deliveries outside the range", () => {
    const storeCode = "UNIFIED-TEST-EXCLUDE";
    createDelivery({
      delivery_code: "INV-U-3",
      store_code: storeCode,
      warehouse_code: null,
      delivery_date: "2026-03-01",
      receipt_store_code: storeCode,
      items: [{ item_code: "A1", item_name: "Widget", quantity: 1, unit: "BOX", item_price: 1, total_item_price: 1 }],
    });

    const { result } = renderHook(() =>
      useUnifiedItemSearch({
        storeCode,
        range: { from: new Date(2026, 3, 1), to: new Date(2026, 3, 30) },
      }),
    );
    expect(result.current.items).toHaveLength(0);
  });
});
