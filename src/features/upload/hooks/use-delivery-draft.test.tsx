import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import type { OcrResult } from "../types";
import { useDeliveryDraft } from "./use-delivery-draft";

const { createDeliveryRequest } = vi.hoisted(() => ({ createDeliveryRequest: vi.fn() }));
vi.mock("@/features/deliveries/lib/api", () => ({ createDeliveryRequest }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

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

function successResult(overrides: Partial<CreateDeliveryResult> = {}): CreateDeliveryResult {
  return {
    status: "success",
    delivery: {
      delivery_code: "INV-DRAFT-1",
      store_code: "STORE1",
      warehouse_code: "WH-NORTH",
      delivery_date: "2026-09-01",
      receipt_store_code: "STORE1",
      uploaded_by: null,
      status: "confirmed",
      created_at: "2026-09-01T00:00:00.000Z",
    },
    acceptedItems: [],
    rejectedItems: [],
    ...overrides,
  };
}

describe("useDeliveryDraft", () => {
  it("flags a store mismatch when the receipt's store differs from the session store", () => {
    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ receipt_store_code: "OTHER-STORE" }), "STORE1"),
      { wrapper },
    );
    expect(result.current.storeMismatch).toBe(true);
  });

  it("does not flag a mismatch when the receipt's store matches (case-insensitive)", () => {
    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ receipt_store_code: "store1" }), "STORE1"),
      { wrapper },
    );
    expect(result.current.storeMismatch).toBe(false);
  });

  it("flags an item row whose printed total doesn't match quantity * price", () => {
    const draft = ocrResult();
    draft.items[0].total_item_price = "999";
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.items[0].hasMismatch).toBe(true);
  });

  it("writes the delivery on confirm and reports success", async () => {
    createDeliveryRequest.mockResolvedValue(successResult());

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-SUCCESS" }), "STORE1"),
      { wrapper },
    );

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.stage).toBe("submitted"));
    expect(result.current.result?.status).toBe("success");
  });

  it("surfaces a duplicate_delivery result without throwing when the code already exists", async () => {
    createDeliveryRequest.mockResolvedValue({
      status: "duplicate_delivery",
      delivery: null,
      acceptedItems: [],
      rejectedItems: [],
    } satisfies CreateDeliveryResult);

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-DUP" }), "STORE1"),
      { wrapper },
    );

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.result?.status).toBe("duplicate_delivery"));
  });

  it("surfaces a network failure as an error and returns to editing, keeping typed rows", async () => {
    createDeliveryRequest.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-NETERR" }), "STORE1"),
      { wrapper },
    );

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.submitError).not.toBeNull());
    expect(result.current.stage).toBe("editing");
    expect(result.current.result).toBeNull();
    expect(result.current.items).toHaveLength(1);
  });

  it("adds and removes item rows", () => {
    const { result } = renderHook(() => useDeliveryDraft(ocrResult(), "STORE1"), { wrapper });

    act(() => result.current.addItem());
    expect(result.current.items).toHaveLength(2);

    const idToRemove = result.current.items[0].localId;
    act(() => result.current.removeItem(idToRemove));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].localId).not.toBe(idToRemove);
  });
});
