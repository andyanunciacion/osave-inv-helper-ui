// Real backend calls, replacing sample-store.ts's in-memory reads/writes.
// Kept as the only module that knows about fetch/URLs — hooks stay
// framework-agnostic about "where the data comes from" the same way they
// were when sample-store.ts played this role.

import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { DeliveryItemUpdate } from "@/types/schema";
import type {
  CreateDeliveryResult,
  DeliveryGroup,
  DeliverySearchResultGroup,
  NewDeliveryInput,
  UnifiedItemRow,
  UpdateItemQuantityInput,
  UpdateItemQuantityResult,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The backend paginates (grouped: 15/page, unified: 50/page by default) to
// bound any single response, but the frontend's own pagination
// (use-paginated-groups.ts) and virtualization (virtual-item-list.tsx)
// expect the full matching set up front. Request the max page size and loop
// if a result set is ever larger than that in one store.
const MAX_PAGE_LIMIT = 200;

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function dateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function rangeParams(range: DateRange | undefined): Record<string, string> {
  if (!range?.from) return {};
  return { dateFrom: dateParam(range.from), dateTo: dateParam(range.to ?? range.from) };
}

export async function createDeliveryRequest(input: NewDeliveryInput): Promise<CreateDeliveryResult> {
  const res = await fetch(`${API_BASE_URL}/api/deliveries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Failed to create delivery (status ${res.status})`);
  }
  return res.json() as Promise<CreateDeliveryResult>;
}

export async function fetchRecentDeliveries(storeCode: string, limit: number): Promise<DeliveryGroup[]> {
  const params = new URLSearchParams({ store_code: storeCode, limit: String(limit) });
  const { groups } = await apiFetch<{ groups: DeliveryGroup[] }>(`/api/deliveries/recent?${params}`);
  return groups;
}

export async function fetchGroupedSearch(
  storeCode: string,
  query: string,
  range: DateRange | undefined,
): Promise<DeliverySearchResultGroup[]> {
  const groups: DeliverySearchResultGroup[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      store_code: storeCode,
      q: query,
      limit: String(MAX_PAGE_LIMIT),
      page: String(page),
      ...rangeParams(range),
    });
    const result = await apiFetch<{
      groups: DeliverySearchResultGroup[];
      pagination: { total: number };
    }>(`/api/search?${params}`);
    groups.push(...result.groups);
    if (groups.length >= result.pagination.total || result.groups.length === 0) break;
  }
  return groups;
}

export async function updateItemQuantity(
  deliveryCode: string,
  itemId: string,
  input: UpdateItemQuantityInput,
): Promise<UpdateItemQuantityResult> {
  const res = await fetch(
    `${API_BASE_URL}/api/deliveries/${encodeURIComponent(deliveryCode)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to update item quantity (status ${res.status})`);
  }
  return res.json() as Promise<UpdateItemQuantityResult>;
}

export async function fetchItemHistory(
  deliveryCode: string,
  itemId: string,
): Promise<DeliveryItemUpdate[]> {
  const { history } = await apiFetch<{ history: DeliveryItemUpdate[] }>(
    `/api/deliveries/${encodeURIComponent(deliveryCode)}/items/${encodeURIComponent(itemId)}/history`,
  );
  return history;
}

export async function fetchUnifiedSearch(
  storeCode: string,
  range: DateRange | undefined,
): Promise<UnifiedItemRow[]> {
  if (!range?.from) return [];

  const items: UnifiedItemRow[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      store_code: storeCode,
      limit: String(MAX_PAGE_LIMIT),
      page: String(page),
      ...rangeParams(range),
    });
    const result = await apiFetch<{ items: UnifiedItemRow[]; pagination: { total: number } }>(
      `/api/search?${params}`,
    );
    items.push(...result.items);
    if (items.length >= result.pagination.total || result.items.length === 0) break;
  }
  return items;
}
