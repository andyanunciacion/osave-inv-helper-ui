import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryItem } from "@/types/schema";
import { useQuantityCorrection } from "./use-quantity-correction";

const { updateItemQuantity } = vi.hoisted(() => ({ updateItemQuantity: vi.fn() }));
vi.mock("../lib/api", () => ({ updateItemQuantity }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const item: DeliveryItem = {
  id: "item-1",
  delivery_code: "INV-1",
  store_code: "STORE1",
  item_code: "4272",
  item_name: "Beer Crate Deposit",
  unit_count: 1,
  quantity: 2,
  unit: "PIECE",
  item_price: 84,
  total_item_price: 168,
  raw_ocr_text: null,
  created_at: "2026-10-07T00:00:00.000Z",
};

describe("useQuantityCorrection", () => {
  beforeEach(() => {
    updateItemQuantity.mockReset();
  });

  it("rejects a blank, non-numeric or negative quantity without sending anything", async () => {
    const { result } = renderHook(() => useQuantityCorrection(item), { wrapper });

    for (const draft of ["", "  ", "abc", "-1"]) {
      let outcome;
      await act(async () => {
        outcome = await result.current.submit(draft, "");
      });
      expect(outcome).toBe("invalid");
      expect(result.current.message).toEqual({ tone: "error", text: "Enter a valid quantity" });
    }
    expect(updateItemQuantity).not.toHaveBeenCalled();
  });

  it("doesn't send a quantity that matches what's already saved", async () => {
    const { result } = renderHook(() => useQuantityCorrection(item), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.submit("2", "recount");
    });

    expect(outcome).toBe("unchanged");
    expect(result.current.message?.tone).toBe("info");
    expect(updateItemQuantity).not.toHaveBeenCalled();
  });

  it("sends a changed quantity with the trimmed reason (blank reason as null)", async () => {
    updateItemQuantity.mockResolvedValue({ item: { ...item, quantity: 3 }, update: null });
    const { result } = renderHook(() => useQuantityCorrection(item), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(" 3 ", "  recount ");
    });
    expect(outcome).toBe("saved");
    expect(result.current.message).toBeNull();
    expect(updateItemQuantity).toHaveBeenCalledWith("INV-1", "item-1", { quantity: 3, reason: "recount" });

    await act(async () => {
      await result.current.submit("4", "   ");
    });
    expect(updateItemQuantity).toHaveBeenLastCalledWith("INV-1", "item-1", { quantity: 4, reason: null });
  });

  it("reports a failed save so the user can try again", async () => {
    updateItemQuantity.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useQuantityCorrection(item), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.submit("5", "");
    });

    expect(outcome).toBe("failed");
    expect(result.current.message).toEqual({ tone: "error", text: "Couldn't save that change — try again." });
  });
});
