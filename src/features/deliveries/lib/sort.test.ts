import { describe, expect, it } from "vitest";
import { compareByItemCode } from "./sort";
import type { DeliveryItem } from "@/types/schema";

function item(item_code: string | null): DeliveryItem {
  return {
    id: item_code ?? "no-code",
    delivery_code: "INV-1",
    store_code: "STORE1",
    item_code,
    item_name: "Item",
    quantity: 1,
    unit: "BOX",
    item_price: 1,
    total_item_price: 1,
    raw_ocr_text: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("compareByItemCode", () => {
  it("sorts codes naturally (numeric-aware), not lexicographically", () => {
    const codes = ["SAN-10", "SAN-2", "SAN-1"];
    const sorted = codes.map(item).sort(compareByItemCode).map((i) => i.item_code);
    expect(sorted).toEqual(["SAN-1", "SAN-2", "SAN-10"]);
  });

  it("sorts items with no code before coded items", () => {
    const items = [item("SAN-1"), item(null), item("SAN-2")];
    const sorted = items.sort(compareByItemCode).map((i) => i.item_code);
    expect(sorted).toEqual([null, "SAN-1", "SAN-2"]);
  });

  it("treats two no-code items as equal", () => {
    expect(compareByItemCode(item(null), item(null))).toBe(0);
  });
});
