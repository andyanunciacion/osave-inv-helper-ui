import { describe, expect, it } from "vitest";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import type { Delivery } from "@/types/schema";
import type { SavedPage } from "../types";
import { batchSavedHeadline, morePagesHint, savedDeliveries } from "./saved-deliveries";

function delivery(code: string, note: string | null = null): Delivery {
  return {
    delivery_code: code,
    store_code: "STORE1",
    warehouse_code: null,
    delivery_date: "2026-10-12",
    receipt_store_code: "STORE1",
    uploaded_by: null,
    note,
    status: "confirmed",
    created_at: "2026-10-12T00:00:00.000Z",
  };
}

function page(index: number, saved: Delivery | null): SavedPage {
  const result: CreateDeliveryResult = {
    status: "success",
    delivery: saved,
    acceptedItems: [],
    rejectedItems: [],
    mergedItems: [],
  };
  return { index, result };
}

describe("savedDeliveries", () => {
  it("lists each delivery once, in the order its pages were uploaded", () => {
    const pages = [page(2, delivery("INV-2")), page(0, delivery("INV-1")), page(1, delivery("INV-1"))];

    expect(savedDeliveries(pages).map((d) => d.delivery_code)).toEqual(["INV-1", "INV-2"]);
  });

  it("orders interleaved receipts by each one's first page", () => {
    const pages = [page(0, delivery("INV-A")), page(1, delivery("INV-B")), page(2, delivery("INV-A"))];

    expect(savedDeliveries(pages).map((d) => d.delivery_code)).toEqual(["INV-A", "INV-B"]);
  });

  it("keeps the latest page's copy of a delivery", () => {
    const pages = [page(1, delivery("INV-1", "from page 2")), page(0, delivery("INV-1", null))];

    expect(savedDeliveries(pages)).toEqual([delivery("INV-1", "from page 2")]);
  });

  it("skips pages with no delivery row", () => {
    expect(savedDeliveries([page(0, null)])).toEqual([]);
  });
});

describe("batchSavedHeadline", () => {
  it("doesn't mention deliveries when the batch was one receipt", () => {
    expect(batchSavedHeadline(1, 1, 1)).toBe("1 page saved with 1 item");
    expect(batchSavedHeadline(3, 25, 1)).toBe("3 pages saved with 25 items");
  });

  it("names the delivery count when the batch held several receipts", () => {
    expect(batchSavedHeadline(3, 25, 2)).toBe("3 pages saved to 2 deliveries with 25 items");
  });
});

describe("morePagesHint", () => {
  it("speaks of 'this delivery' only when there is one", () => {
    expect(morePagesHint(1)).toContain("this delivery");
    expect(morePagesHint(2)).not.toContain("this delivery");
    expect(morePagesHint(2)).toContain("same Inv. Tran. No.");
  });
});
