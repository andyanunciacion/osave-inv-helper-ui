// In-memory stand-in for the Supabase `deliveries`/`delivery_items` tables
// (AI_DOCS/main-file.md §4) so the frontend prototype can be built and
// demoed before the backend exists. Pure, framework-agnostic module state —
// hooks in ../hooks subscribe to it the same way they'll later subscribe to
// a Supabase Realtime channel, so swapping the backend in later shouldn't
// change any hook's public shape.
//
// Resets on page refresh (in-memory only, by design for this prototype).

import type { Delivery, DeliveryItem, ItemUnit } from "@/types/schema";
import type {
  CreateDeliveryResult,
  DeliveryGroup,
  NewDeliveryInput,
  RejectedItem,
} from "../types";

interface SampleData {
  deliveries: Delivery[];
  items: DeliveryItem[];
}

let data: SampleData = { deliveries: [], items: [] };
const seededStores = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SampleData {
  return data;
}

function normalizeStoreCode(storeCode: string): string {
  return storeCode.trim().toUpperCase();
}

// -- seeding --------------------------------------------------------------

const SAMPLE_CATALOG: Array<{
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  item_price: number;
}> = [
  { item_code: "SAN-1002", item_name: "Coconut Milk 400ml", unit: "BOX", item_price: 420 },
  { item_code: "SAN-1015", item_name: "Instant Noodles - Beef", unit: "BOX", item_price: 350 },
  { item_code: "SAN-1023", item_name: "Bottled Water 500ml", unit: "BOX", item_price: 180 },
  { item_code: "SAN-1041", item_name: "Cooking Oil 1L", unit: "PIECE", item_price: 95 },
  { item_code: "SAN-1058", item_name: "White Sugar 1kg", unit: "PIECE", item_price: 68 },
  { item_code: "SAN-1067", item_name: "Canned Sardines", unit: "BOX", item_price: 240 },
  { item_code: "SAN-1074", item_name: "Laundry Detergent 1kg", unit: "PIECE", item_price: 145 },
  { item_code: "SAN-1089", item_name: "Instant Coffee 3-in-1", unit: "BOX", item_price: 210 },
  { item_code: "SAN-1096", item_name: "Toilet Paper 12-roll", unit: "PIECE", item_price: 260 },
  { item_code: "SAN-1103", item_name: "Soy Sauce 1L", unit: "PIECE", item_price: 72 },
  { item_code: "SAN-1118", item_name: "Powdered Milk 900g", unit: "PIECE", item_price: 385 },
  { item_code: "SAN-1127", item_name: "Crackers Family Pack", unit: "BOX", item_price: 165 },
];

const WAREHOUSE_CODES = ["WH-NORTH", "WH-CENTRAL", "WH-SOUTH"];

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function isoTimestampDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Deterministic per store code + delivery index, so a given store's demo
// data looks the same across reloads within a session without needing a
// real seeded RNG library.
function seedNumber(storeCode: string, salt: number): number {
  let hash = 0;
  for (const char of `${storeCode}:${salt}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function buildSeedForStore(storeCode: string): SampleData {
  const deliveries: Delivery[] = [];
  const items: DeliveryItem[] = [];
  const deliveryCount = 3;

  for (let d = 0; d < deliveryCount; d++) {
    const daysAgo = 1 + d * 3 + (seedNumber(storeCode, d) % 3);
    const deliveryCode = `INV-${(seedNumber(storeCode, d * 7 + 1) % 90000) + 10000}`;
    const itemCount = 3 + (seedNumber(storeCode, d * 13 + 2) % 5);
    // Every second seeded delivery flags a receipt/session store mismatch,
    // so the review-screen warning (§5 rule 6) is demoable without an
    // upload — mirrored in the review screen's own mismatch check too.
    const receiptStoreCode = d === 1 ? `${storeCode}X` : storeCode;

    const delivery: Delivery = {
      delivery_code: deliveryCode,
      store_code: storeCode,
      warehouse_code: pick(WAREHOUSE_CODES, seedNumber(storeCode, d * 3)),
      delivery_date: isoDateDaysAgo(daysAgo),
      receipt_store_code: receiptStoreCode,
      uploaded_by: "seed-data",
      status: "confirmed",
      created_at: isoTimestampDaysAgo(daysAgo),
    };
    deliveries.push(delivery);

    for (let i = 0; i < itemCount; i++) {
      const catalogEntry = pick(SAMPLE_CATALOG, seedNumber(storeCode, d * 100 + i));
      const quantity = 1 + (seedNumber(storeCode, d * 100 + i + 50) % 12);
      items.push({
        id: `${deliveryCode}-${catalogEntry.item_code}`,
        delivery_code: deliveryCode,
        store_code: storeCode,
        item_code: catalogEntry.item_code,
        item_name: catalogEntry.item_name,
        quantity,
        unit: catalogEntry.unit,
        item_price: catalogEntry.item_price,
        total_item_price: Math.round(quantity * catalogEntry.item_price * 100) / 100,
        raw_ocr_text: null,
        created_at: delivery.created_at,
      });
    }
  }

  return { deliveries, items };
}

export function ensureSeedForStore(storeCode: string): void {
  const normalized = normalizeStoreCode(storeCode);
  if (!normalized || seededStores.has(normalized)) return;
  seededStores.add(normalized);

  const seeded = buildSeedForStore(normalized);
  data = {
    deliveries: [...data.deliveries, ...seeded.deliveries],
    items: [...data.items, ...seeded.items],
  };
  notify();
}

// -- reads ------------------------------------------------------------------

export function listGroupsForStore(storeCode: string): DeliveryGroup[] {
  const normalized = normalizeStoreCode(storeCode);
  return data.deliveries
    .filter((delivery) => delivery.store_code === normalized)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((delivery) => ({
      delivery,
      items: data.items.filter((item) => item.delivery_code === delivery.delivery_code),
    }));
}

// -- writes -------------------------------------------------------------

// §5 rules 2/3/5: a duplicate delivery_code rejects the whole receipt (it
// collides with the deliveries primary key); a duplicate item_code within
// the same batch rejects only that row. Items with no printed code fall
// back to a name-based key (§4 "open decision", option 1) so the
// duplicate check still has something to key on.
export function createDelivery(input: NewDeliveryInput): CreateDeliveryResult {
  const deliveryCode = input.delivery_code.trim();

  if (data.deliveries.some((delivery) => delivery.delivery_code === deliveryCode)) {
    return {
      status: "duplicate_delivery",
      delivery: null,
      acceptedItems: [],
      rejectedItems: [],
    };
  }

  const seenKeys = new Set<string>();
  const acceptedItems: DeliveryItem[] = [];
  const rejectedItems: RejectedItem[] = [];
  const now = new Date().toISOString();

  for (const item of input.items) {
    const itemCode = item.item_code?.trim() || null;
    const dedupeKey = itemCode ?? `name:${item.item_name.trim().toLowerCase()}`;

    if (seenKeys.has(dedupeKey)) {
      rejectedItems.push({
        item_code: itemCode,
        item_name: item.item_name,
        reason: "duplicate_item_code",
      });
      continue;
    }
    seenKeys.add(dedupeKey);

    acceptedItems.push({
      id: crypto.randomUUID(),
      delivery_code: deliveryCode,
      store_code: input.store_code,
      item_code: itemCode,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      item_price: item.item_price,
      total_item_price: item.total_item_price,
      raw_ocr_text: null,
      created_at: now,
    });
  }

  const delivery: Delivery = {
    delivery_code: deliveryCode,
    store_code: input.store_code,
    warehouse_code: input.warehouse_code,
    delivery_date: input.delivery_date,
    receipt_store_code: input.receipt_store_code,
    uploaded_by: "prototype-session",
    status: "confirmed",
    created_at: now,
  };

  data = {
    deliveries: [...data.deliveries, delivery],
    items: [...data.items, ...acceptedItems],
  };
  notify();

  return {
    status: rejectedItems.length > 0 ? "partial" : "success",
    delivery,
    acceptedItems,
    rejectedItems,
  };
}
