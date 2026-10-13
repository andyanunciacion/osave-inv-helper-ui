import { describe, expect, it } from "vitest";
import type { CreateDeliveryResult, MergedItem } from "@/features/deliveries/types";
import type { DeliveryItem } from "@/types/schema";
import { mergedItemLabel, savedPageNotice, splitMergedItems } from "./merged-items";

const merged = (overrides: Partial<MergedItem> = {}): MergedItem => ({
  item_code: "4272",
  item_name: "BEER CRATE DEPOSIT",
  mergedCount: 2,
  fieldsDisagreed: false,
  ...overrides,
});

const result = (acceptedCount: number, mergedItems: MergedItem[] = []): CreateDeliveryResult => ({
  status: "success",
  delivery: null,
  acceptedItems: Array.from({ length: acceptedCount }, () => ({}) as DeliveryItem),
  rejectedItems: [],
  mergedItems,
});

describe("splitMergedItems", () => {
  it("separates merges whose other fields disagreed from clean ones", () => {
    const clean = merged();
    const disagreed = merged({ item_code: "5110", fieldsDisagreed: true });
    expect(splitMergedItems([clean, disagreed])).toEqual({ clean: [clean], disagreed: [disagreed] });
  });
});

describe("mergedItemLabel", () => {
  it("falls back to the item name for a code-less row", () => {
    expect(mergedItemLabel(merged({ item_code: null, mergedCount: 3 }))).toBe(
      "BEER CRATE DEPOSIT (3 rows combined)",
    );
  });
});

describe("savedPageNotice", () => {
  it("reports the saved item count", () => {
    expect(savedPageNotice(1, result(1))).toBe("Page 1 saved — 1 item");
  });

  it("mentions merged items so a mid-batch merge isn't silent", () => {
    expect(savedPageNotice(2, result(6, [merged()]))).toBe("Page 2 saved — 6 items · 1 item combined");
    expect(savedPageNotice(2, result(19, [merged(), merged({ item_code: "5110" })]))).toBe(
      "Page 2 saved — 19 items · 2 items combined",
    );
  });
});
