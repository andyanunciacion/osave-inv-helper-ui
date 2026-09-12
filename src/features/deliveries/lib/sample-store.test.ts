import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDelivery, listGroupsForStore } from "./sample-store";
import type { NewDeliveryInput } from "../types";

function baseInput(overrides: Partial<NewDeliveryInput> = {}): NewDeliveryInput {
  return {
    delivery_code: "INV-1",
    store_code: "STORE1",
    warehouse_code: "WH-NORTH",
    delivery_date: "2026-09-01",
    receipt_store_code: "STORE1",
    items: [
      {
        item_code: "A1",
        item_name: "Item A",
        quantity: 2,
        unit: "BOX",
        item_price: 10,
        total_item_price: 20,
      },
    ],
    ...overrides,
  };
}

describe("createDelivery", () => {
  beforeEach(() => {
    // sample-store keeps module-level state; reset delivery_code namespace
    // per test by using unique codes rather than resetting the module.
    vi.stubGlobal("crypto", { randomUUID: () => Math.random().toString(36) });
  });

  it("writes the delivery and its items on first submission", () => {
    const result = createDelivery(baseInput({ delivery_code: "INV-UNIQUE-1" }));

    expect(result.status).toBe("success");
    expect(result.delivery?.delivery_code).toBe("INV-UNIQUE-1");
    expect(result.acceptedItems).toHaveLength(1);
    expect(result.rejectedItems).toHaveLength(0);
  });

  it("rejects the whole receipt when delivery_code already exists (§5 rule 2/5)", () => {
    createDelivery(baseInput({ delivery_code: "INV-DUP-DELIVERY" }));
    const second = createDelivery(baseInput({ delivery_code: "INV-DUP-DELIVERY" }));

    expect(second.status).toBe("duplicate_delivery");
    expect(second.delivery).toBeNull();
  });

  it("rejects only the duplicate item row within a batch, not the whole delivery (§5 rule 3/5)", () => {
    const result = createDelivery(
      baseInput({
        delivery_code: "INV-DUP-ITEM",
        items: [
          { item_code: "A1", item_name: "Item A", quantity: 1, unit: "BOX", item_price: 10, total_item_price: 10 },
          { item_code: "A1", item_name: "Item A (again)", quantity: 1, unit: "BOX", item_price: 10, total_item_price: 10 },
          { item_code: "B1", item_name: "Item B", quantity: 1, unit: "PIECE", item_price: 5, total_item_price: 5 },
        ],
      }),
    );

    expect(result.status).toBe("partial");
    expect(result.acceptedItems).toHaveLength(2);
    expect(result.rejectedItems).toHaveLength(1);
    expect(result.rejectedItems[0].item_code).toBe("A1");
  });

  it("falls back to a name-based dedupe key for items with no printed code (§4 open decision)", () => {
    const result = createDelivery(
      baseInput({
        delivery_code: "INV-NO-CODE",
        items: [
          { item_code: null, item_name: "Mystery Item", quantity: 1, unit: null, item_price: null, total_item_price: null },
          { item_code: null, item_name: "Mystery Item", quantity: 1, unit: null, item_price: null, total_item_price: null },
        ],
      }),
    );

    expect(result.acceptedItems).toHaveLength(1);
    expect(result.rejectedItems).toHaveLength(1);
  });

  it("makes confirmed deliveries visible via listGroupsForStore", () => {
    createDelivery(baseInput({ delivery_code: "INV-VISIBLE", store_code: "STORE-VISIBLE" }));

    const groups = listGroupsForStore("STORE-VISIBLE");
    expect(groups.some((group) => group.delivery.delivery_code === "INV-VISIBLE")).toBe(true);
  });
});
