import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Delivery } from "@/types/schema";
import { DELIVERY_NOTE_MAX_LENGTH, useDeliveryNote } from "./use-delivery-note";

const { updateDeliveryNote } = vi.hoisted(() => ({ updateDeliveryNote: vi.fn() }));
vi.mock("../lib/api", () => ({ updateDeliveryNote }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function delivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    delivery_code: "INV-1",
    store_code: "STORE1",
    warehouse_code: null,
    delivery_date: "2026-10-12",
    receipt_store_code: "STORE1",
    uploaded_by: null,
    note: null,
    status: "confirmed",
    created_at: "2026-10-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("useDeliveryNote", () => {
  beforeEach(() => {
    updateDeliveryNote.mockReset();
  });

  it("pre-fills the note already saved on the delivery", () => {
    const { result } = renderHook(() => useDeliveryNote(delivery({ note: "2 boxes dented" })), { wrapper });

    expect(result.current.draft).toBe("2 boxes dented");
    expect(result.current.canSave).toBe(false);
  });

  it("treats a delivery without the note field (older backend) as having no note", () => {
    const withoutNote: Partial<Delivery> = delivery();
    delete withoutNote.note;
    const { result } = renderHook(() => useDeliveryNote(withoutNote as Delivery), { wrapper });

    expect(result.current.draft).toBe("");
    expect(result.current.canSave).toBe(false);
  });

  it("only allows saving when the trimmed text differs from what's saved", () => {
    const { result } = renderHook(() => useDeliveryNote(delivery({ note: "late" })), { wrapper });

    act(() => result.current.setDraft("  late  "));
    expect(result.current.canSave).toBe(false);

    act(() => result.current.setDraft("late by 2 hours"));
    expect(result.current.canSave).toBe(true);
  });

  it("sends the trimmed note scoped to the store and shows it saved", async () => {
    updateDeliveryNote.mockResolvedValue(delivery({ note: "Missing 1 crate" }));
    const { result } = renderHook(() => useDeliveryNote(delivery()), { wrapper });

    act(() => result.current.setDraft("  Missing 1 crate "));
    let saved;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(true);
    expect(updateDeliveryNote).toHaveBeenCalledWith("INV-1", { store_code: "STORE1", note: "Missing 1 crate" });
    expect(result.current.draft).toBe("Missing 1 crate");
    expect(result.current.canSave).toBe(false);
    expect(result.current.message).toEqual({ tone: "info", text: "Note saved." });
  });

  it("clears the note when the box is emptied", async () => {
    updateDeliveryNote.mockResolvedValue(delivery({ note: null }));
    const { result } = renderHook(() => useDeliveryNote(delivery({ note: "old" })), { wrapper });

    act(() => result.current.setDraft("   "));
    await act(async () => {
      await result.current.save();
    });

    expect(updateDeliveryNote).toHaveBeenCalledWith("INV-1", { store_code: "STORE1", note: null });
    expect(result.current.message).toEqual({ tone: "info", text: "Note removed." });
  });

  it("rejects an over-long note without sending it", async () => {
    const { result } = renderHook(() => useDeliveryNote(delivery()), { wrapper });

    act(() => result.current.setDraft("x".repeat(DELIVERY_NOTE_MAX_LENGTH + 1)));
    let saved;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(false);
    expect(updateDeliveryNote).not.toHaveBeenCalled();
    expect(result.current.message?.tone).toBe("error");
  });

  it("keeps the draft and reports a failed save so the user can retry", async () => {
    updateDeliveryNote.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useDeliveryNote(delivery()), { wrapper });

    act(() => result.current.setDraft("Short 3 pcs"));
    let saved;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(false);
    expect(result.current.draft).toBe("Short 3 pcs");
    expect(result.current.canSave).toBe(true);
    expect(result.current.message).toEqual({ tone: "error", text: "Couldn't save the note — try again." });
  });

  it("drops a stale message once the text changes", async () => {
    updateDeliveryNote.mockResolvedValue(delivery({ note: "ok" }));
    const { result } = renderHook(() => useDeliveryNote(delivery()), { wrapper });

    act(() => result.current.setDraft("ok"));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.message).not.toBeNull();

    act(() => result.current.setDraft("ok, 1 box wet"));
    expect(result.current.message).toBeNull();
  });

  it("can't save offline, and sends nothing", async () => {
    onlineManager.setOnline(false);
    try {
      const { result } = renderHook(() => useDeliveryNote(delivery()), { wrapper });
      act(() => result.current.setDraft("1 box wet"));

      expect(result.current.isOffline).toBe(true);
      expect(result.current.canSave).toBe(false);
      await act(async () => {
        await result.current.save();
      });
      expect(updateDeliveryNote).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
