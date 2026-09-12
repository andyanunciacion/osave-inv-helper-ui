import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDelivery } from "@/features/deliveries/lib/sample-store";
import type { OcrResult } from "../types";
import { useDeliveryDraft } from "./use-delivery-draft";

function ocrResult(overrides: Partial<OcrResult["header"]> = {}): OcrResult {
  return {
    header: {
      delivery_code: "INV-DRAFT-1",
      warehouse_code: "WH-NORTH",
      delivery_date: "2026-09-01",
      receipt_store_code: "STORE1",
      ...overrides,
    },
    items: [
      {
        localId: "a",
        item_code: "A1",
        item_name: "Item A",
        quantity: "2",
        unit: "BOX",
        item_price: "10",
        total_item_price: "20",
      },
    ],
  };
}

describe("useDeliveryDraft", () => {
  it("flags a store mismatch when the receipt's store differs from the session store", () => {
    const { result } = renderHook(() =>
      useDeliveryDraft(ocrResult({ receipt_store_code: "OTHER-STORE" }), "STORE1"),
    );
    expect(result.current.storeMismatch).toBe(true);
  });

  it("does not flag a mismatch when the receipt's store matches (case-insensitive)", () => {
    const { result } = renderHook(() =>
      useDeliveryDraft(ocrResult({ receipt_store_code: "store1" }), "STORE1"),
    );
    expect(result.current.storeMismatch).toBe(false);
  });

  it("flags an item row whose printed total doesn't match quantity * price", () => {
    const draft = ocrResult();
    draft.items[0].total_item_price = "999";
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"));
    expect(result.current.items[0].hasMismatch).toBe(true);
  });

  it("writes the delivery on confirm and reports success", () => {
    const { result } = renderHook(() =>
      useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-SUCCESS" }), "STORE1"),
    );

    act(() => result.current.confirm());

    expect(result.current.stage).toBe("submitted");
    expect(result.current.result?.status).toBe("success");
  });

  it("surfaces a duplicate_delivery result without throwing when the code already exists", () => {
    createDelivery({
      delivery_code: "INV-DRAFT-DUP",
      store_code: "STORE1",
      warehouse_code: null,
      delivery_date: "2026-09-01",
      receipt_store_code: "STORE1",
      items: [],
    });

    const { result } = renderHook(() =>
      useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-DUP" }), "STORE1"),
    );

    act(() => result.current.confirm());

    expect(result.current.result?.status).toBe("duplicate_delivery");
  });

  it("adds and removes item rows", () => {
    const { result } = renderHook(() => useDeliveryDraft(ocrResult(), "STORE1"));

    act(() => result.current.addItem());
    expect(result.current.items).toHaveLength(2);

    const idToRemove = result.current.items[0].localId;
    act(() => result.current.removeItem(idToRemove));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].localId).not.toBe(idToRemove);
  });
});
