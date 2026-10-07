import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeliveryRequestError } from "@/features/deliveries/lib/request-error";
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
      printout_datetime: "2026-09-01T10:00:00",
      ...overrides,
    },
    items: [
      {
        localId: "a",
        item_code: "A1",
        item_name: "Item A",
        unit_count: "12",
        quantity: "2",
        unit: "BOX",
        item_price: "10",
        total_item_price: "240",
        inferred: [],
        has_annotation: false,
      },
    ],
    totals: { total_pcs: "", total_box: "", total_items: "", total_value: "" },
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
    mergedItems: [],
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

  it("blocks confirming a store mismatch, and sends nothing", () => {
    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ receipt_store_code: "OTHER-STORE" }), "STORE1"),
      { wrapper },
    );
    expect(result.current.canConfirm).toBe(false);

    createDeliveryRequest.mockClear();
    act(() => result.current.confirm());
    expect(createDeliveryRequest).not.toHaveBeenCalled();
    expect(result.current.stage).toBe("editing");
  });

  it("requires the receipt's store code — a blank one blocks confirming until it's typed", () => {
    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ receipt_store_code: "" }), "STORE1"),
      { wrapper },
    );
    expect(result.current.missingReceiptStoreCode).toBe(true);
    expect(result.current.storeMismatch).toBe(false);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.updateHeaderField("receipt_store_code", "store1"));
    expect(result.current.missingReceiptStoreCode).toBe(false);
    expect(result.current.canConfirm).toBe(true);
  });

  it("flags an item row whose printed total doesn't match quantity * unit_count * price", () => {
    const draft = ocrResult();
    draft.items[0].total_item_price = "999";
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.items[0].hasMismatch).toBe(true);
  });

  it("does not flag a row whose total matches quantity * unit_count * price", () => {
    const { result } = renderHook(() => useDeliveryDraft(ocrResult(), "STORE1"), { wrapper });
    expect(result.current.items[0].hasMismatch).toBe(false);
  });

  it("marks cells OCR couldn't read as blank, on rows that have other content", () => {
    const draft = ocrResult();
    draft.items[0].quantity = "";
    draft.items[0].unit = "";
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.items[0].blankFields).toEqual(["unit", "quantity"]);
  });

  it("doesn't mark a freshly added, untouched row as blank", () => {
    const { result } = renderHook(() => useDeliveryDraft(ocrResult(), "STORE1"), { wrapper });
    act(() => result.current.addItem());
    expect(result.current.items[1].blankFields).toEqual([]);
  });

  it("blocks confirming while a row has numbers but no description, instead of dropping it", () => {
    const draft = ocrResult();
    draft.items.push({
      localId: "b",
      item_code: "",
      item_name: "",
      unit_count: "",
      quantity: "",
      unit: "",
      item_price: "",
      total_item_price: "627.72",
      inferred: [],
      has_annotation: false,
    });
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.unnamedRowCount).toBe(1);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.updateItemField("b", "item_name", "Baby Diaper Pants"));
    expect(result.current.unnamedRowCount).toBe(0);
    // Its other blank cells still block (see the blank-cell test below).
    expect(result.current.canConfirm).toBe(false);
  });

  it("requires the transaction date — a blank one blocks confirming until it's entered", () => {
    const { result } = renderHook(() => useDeliveryDraft(ocrResult({ delivery_date: "" }), "STORE1"), {
      wrapper,
    });
    expect(result.current.missingDeliveryDate).toBe(true);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.updateHeaderField("delivery_date", "2026-09-14"));
    expect(result.current.missingDeliveryDate).toBe(false);
    expect(result.current.canConfirm).toBe(true);
  });

  it("blocks confirming while any red-outlined cell is blank, until it's filled in", () => {
    const draft = ocrResult();
    draft.items[0].quantity = "";
    draft.items[0].item_price = "";
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.blankFieldCount).toBe(2);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.updateItemField("a", "quantity", "2"));
    expect(result.current.blankFieldCount).toBe(1);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.updateItemField("a", "item_price", "10"));
    expect(result.current.blankFieldCount).toBe(0);
    expect(result.current.canConfirm).toBe(true);
  });

  it("puts rows with blank cells first, and doesn't reorder them as they're filled in", () => {
    const draft = ocrResult();
    const complete = draft.items[0];
    draft.items = [
      { ...complete, localId: "first-complete", item_code: "C1" },
      { ...complete, localId: "incomplete", item_code: "C2", quantity: "" },
      { ...complete, localId: "second-complete", item_code: "C3" },
    ];
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    const order = () => result.current.items.map((item) => item.localId);
    expect(order()).toEqual(["incomplete", "first-complete", "second-complete"]);

    act(() => result.current.updateItemField("incomplete", "quantity", "2"));
    expect(order()).toEqual(["incomplete", "first-complete", "second-complete"]);
  });

  it("sends unit_count, quantity and the required receipt_store_code on confirm", async () => {
    createDeliveryRequest.mockClear();
    createDeliveryRequest.mockResolvedValue(successResult());

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ receipt_store_code: " store1 " }), "STORE1"),
      { wrapper },
    );
    act(() => result.current.confirm());

    await waitFor(() => expect(createDeliveryRequest).toHaveBeenCalledTimes(1));
    const sent = createDeliveryRequest.mock.calls[0][0];
    expect(sent.receipt_store_code).toBe("store1");
    expect(sent.items[0]).toMatchObject({ unit_count: 12, quantity: 2, unit: "BOX" });
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
      mergedItems: [],
    } satisfies CreateDeliveryResult);

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-DUP" }), "STORE1"),
      { wrapper },
    );

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.result?.status).toBe("duplicate_delivery"));
  });

  it("surfaces the backend's store_mismatch result and lets the user go back to editing", async () => {
    createDeliveryRequest.mockResolvedValue({
      status: "store_mismatch",
      delivery: null,
      acceptedItems: [],
      rejectedItems: [],
      mergedItems: [],
    } satisfies CreateDeliveryResult);

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-MISMATCH" }), "STORE1"),
      { wrapper },
    );

    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.result?.status).toBe("store_mismatch"));

    act(() => result.current.editAgain());
    expect(result.current.stage).toBe("editing");
    expect(result.current.items).toHaveLength(1);
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

  it("reports a server refusal as such, not as a connection problem", async () => {
    createDeliveryRequest.mockRejectedValue(new DeliveryRequestError(400, "invalid_body", ["delivery_date"]));

    const { result } = renderHook(
      () => useDeliveryDraft(ocrResult({ delivery_code: "INV-DRAFT-400" }), "STORE1"),
      { wrapper },
    );
    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.submitError).not.toBeNull());
    expect(result.current.submitError).toContain("Transaction date");
    expect(result.current.submitError).not.toContain("connection");
    expect(result.current.stage).toBe("editing");
  });

  it("stops marking a calculated cell as calculated once the user edits it", () => {
    const draft = ocrResult();
    draft.items[0].inferred = ["quantity", "unit"];
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });

    act(() => result.current.updateItemField("a", "quantity", "3"));
    expect(result.current.items[0].inferred).toEqual(["unit"]);
  });

  it("checks the rows against the receipt's printed totals as they're edited", () => {
    const draft = ocrResult();
    draft.totals = { total_pcs: "", total_box: "2", total_items: "1", total_value: "240.00" };
    const { result } = renderHook(() => useDeliveryDraft(draft, "STORE1"), { wrapper });
    expect(result.current.totalsCheck).toEqual({ mismatches: [], checked: 3 });

    act(() => result.current.updateItemField("a", "quantity", "3"));
    expect(result.current.totalsCheck.mismatches).toEqual([{ kind: "total_box", printed: 2, counted: 3 }]);
    // A warning only — it doesn't stop the user confirming.
    expect(result.current.canConfirm).toBe(true);
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
