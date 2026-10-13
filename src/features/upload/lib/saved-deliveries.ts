import type { Delivery } from "@/types/schema";
import type { SavedPage } from "../types";

// The deliveries a batch saved to, once each — every page of one receipt
// shares a delivery_code, so a 5-photo upload is usually a single delivery
// that gets a single note box. Each delivery keeps the position of its first
// page, so the boxes follow the page list even when receipts are interleaved;
// the latest page's row wins, as it's the freshest copy of the delivery
// (including any note already on it).
export function savedDeliveries(pages: SavedPage[]): Delivery[] {
  const byCode = new Map<string, Delivery>();
  for (const { result } of [...pages].sort((a, b) => a.index - b.index)) {
    if (result.delivery) byCode.set(result.delivery.delivery_code, result.delivery);
  }
  return [...byCode.values()];
}

const plural = (count: number, noun: string, plural = `${noun}s`) =>
  `${count} ${count === 1 ? noun : plural}`;

// The summary's headline — a batch can hold several receipts, so it names how
// many deliveries the pages went to when that's more than one.
export function batchSavedHeadline(pageCount: number, itemCount: number, deliveryCount: number): string {
  const deliveries = deliveryCount > 1 ? ` to ${plural(deliveryCount, "delivery", "deliveries")}` : "";
  return `${plural(pageCount, "page")} saved${deliveries} with ${plural(itemCount, "item")}`;
}

export function morePagesHint(deliveryCount: number): string {
  return deliveryCount > 1
    ? "A receipt has more pages? Upload them — each page is added to the delivery with the same Inv. Tran. No."
    : "Receipt has more pages? Upload the next page — its items are added to this delivery.";
}
