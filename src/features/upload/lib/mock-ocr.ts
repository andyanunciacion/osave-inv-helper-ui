// Stands in for the §7 OCR proxy endpoint until the backend exists. Returns
// one of a few canned "extracted" receipts after a short delay, so the
// capture → processing → review flow (§6 flow B, §8 background upload) is
// fully demoable with sample data.

import { format, subDays } from "date-fns";
import type { DraftItem, OcrResult } from "../types";

function draftItem(item: Omit<DraftItem, "localId">): DraftItem {
  return { ...item, localId: crypto.randomUUID() };
}

const RECEIPT_TEMPLATES: Array<{
  warehouse_code: string;
  daysAgo: number;
  items: Array<Omit<DraftItem, "localId">>;
}> = [
  {
    warehouse_code: "WH-NORTH",
    daysAgo: 0,
    items: [
      { item_code: "SAN-1002", item_name: "Coconut Milk 400ml", quantity: "12", unit: "BOX", item_price: "420", total_item_price: "5040" },
      { item_code: "SAN-1015", item_name: "Instant Noodles - Beef", quantity: "24", unit: "BOX", item_price: "350", total_item_price: "8400" },
      // Intentional mismatch (24 * 95 = 2280, not 1900) to demo the
      // quantity×price/total flag from §4.
      { item_code: "SAN-1041", item_name: "Cooking Oil 1L", quantity: "24", unit: "PIECE", item_price: "95", total_item_price: "1900" },
      { item_code: "SAN-1096", item_name: "Toilet Paper 12-roll", quantity: "6", unit: "PIECE", item_price: "260", total_item_price: "1560" },
    ],
  },
  {
    warehouse_code: "WH-SOUTH",
    daysAgo: 1,
    items: [
      { item_code: "SAN-1058", item_name: "White Sugar 1kg", quantity: "50", unit: "PIECE", item_price: "68", total_item_price: "3400" },
      { item_code: "SAN-1089", item_name: "Instant Coffee 3-in-1", quantity: "10", unit: "BOX", item_price: "210", total_item_price: "2100" },
      { item_code: "", item_name: "Assorted Candy (no code on slip)", quantity: "8", unit: "PIECE", item_price: "45", total_item_price: "360" },
    ],
  },
];

function randomDeliveryCode(): string {
  return `INV-${Math.floor(10000 + Math.random() * 90000)}`;
}

// The receipt's printed "To" store code is whatever the warehouse printed —
// it doesn't know the current session. Most of the time it matches the
// active session's store (the common case); occasionally it doesn't, to
// keep the §5 rule 6 mismatch warning demoable.
function pickReceiptStoreCode(sessionStoreCode: string): string {
  return Math.random() < 0.7 ? sessionStoreCode : `${sessionStoreCode}-OLD`;
}

const OCR_DELAY_MS = 1200;

export function runMockOcr(sessionStoreCode: string): Promise<OcrResult> {
  const template = RECEIPT_TEMPLATES[Math.floor(Math.random() * RECEIPT_TEMPLATES.length)];

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        header: {
          delivery_code: randomDeliveryCode(),
          warehouse_code: template.warehouse_code,
          delivery_date: format(subDays(new Date(), template.daysAgo), "yyyy-MM-dd"),
          receipt_store_code: pickReceiptStoreCode(sessionStoreCode),
        },
        items: template.items.map(draftItem),
      });
    }, OCR_DELAY_MS);
  });
}
