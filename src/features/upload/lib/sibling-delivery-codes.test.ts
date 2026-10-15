import { describe, expect, it } from "vitest";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import type { DraftHeader, SavedPage } from "../types";
import { deliveryCodeMismatch, siblingDeliveryCodes } from "./sibling-delivery-codes";

const header = (overrides: Partial<DraftHeader> = {}): DraftHeader => ({
  delivery_code: "ITPH1978604",
  warehouse_code: "BUN DC",
  delivery_date: "2026-09-14",
  receipt_store_code: "245",
  printout_datetime: "2026-09-14T23:45:27",
  ...overrides,
});

const saved = (index: number, deliveryCode: string): SavedPage => ({
  index,
  result: {
    status: "success",
    delivery: { delivery_code: deliveryCode } as NonNullable<CreateDeliveryResult["delivery"]>,
    acceptedItems: [],
    rejectedItems: [],
    mergedItems: [],
  },
});

describe("siblingDeliveryCodes", () => {
  it("lists the distinct codes of the other pages from the same printout", () => {
    const headers = [
      header({ delivery_code: "ITPH1978G04" }),
      header(),
      header({ delivery_code: " ITPH1978604 " }),
      header({ delivery_code: "" }),
    ];
    expect(siblingDeliveryCodes(headers, 0, [])).toEqual(["ITPH1978604"]);
    expect(siblingDeliveryCodes(headers, 1, [])).toEqual(["ITPH1978G04", "ITPH1978604"]);
  });

  it("ignores pages from another printout, and has none for a page without a timestamp", () => {
    const headers = [
      header(),
      header({ delivery_code: "ITPH2", printout_datetime: "2026-09-14T23:45:28" }),
      header({ delivery_code: "ITPH3", printout_datetime: "" }),
    ];
    expect(siblingDeliveryCodes(headers, 0, [])).toEqual([]);
    expect(siblingDeliveryCodes(headers, 2, [])).toEqual([]);
  });

  it("counts a saved page with the code it was saved under", () => {
    // Page 1 was misread and corrected to page 2's code before saving.
    const headers = [header({ delivery_code: "ITPH1978G04" }), header()];
    expect(siblingDeliveryCodes(headers, 1, [saved(0, "ITPH1978604")])).toEqual(["ITPH1978604"]);
  });

  it("falls back to the read code for a page saved without a delivery", () => {
    const headers = [header({ delivery_code: "ITPH1" }), header()];
    const duplicate: SavedPage = { index: 0, result: { ...saved(0, "").result, delivery: null } };
    expect(siblingDeliveryCodes(headers, 1, [duplicate])).toEqual(["ITPH1"]);
  });
});

describe("deliveryCodeMismatch", () => {
  it("returns the sibling codes when the page's code matches none of them", () => {
    expect(deliveryCodeMismatch("ITPH1978G04", ["ITPH1978604"])).toEqual(["ITPH1978604"]);
  });

  it("is empty when the code matches a sibling (after trimming)", () => {
    expect(deliveryCodeMismatch(" ITPH1978604 ", ["ITPH1978G04", "ITPH1978604"])).toEqual([]);
  });

  it("compares case-sensitively, like the backend's delivery key", () => {
    expect(deliveryCodeMismatch("itph1978604", ["ITPH1978604"])).toEqual(["ITPH1978604"]);
  });

  it("is empty for a blank code or no siblings", () => {
    expect(deliveryCodeMismatch(" ", ["ITPH1978604"])).toEqual([]);
    expect(deliveryCodeMismatch("ITPH1978604", [])).toEqual([]);
  });
});
