import type { DeliveryItem } from "@/types/schema";

// Shared item ordering for search results (grouped and unified views alike):
// always by item_code, natural/numeric so "SAN-2" sorts before "SAN-10".
// item_code is nullable (§4) — items with no printed code sort first, ahead
// of every coded item.
export function compareByItemCode(a: DeliveryItem, b: DeliveryItem): number {
  if (a.item_code === null && b.item_code === null) return 0;
  if (a.item_code === null) return -1;
  if (b.item_code === null) return 1;
  return a.item_code.localeCompare(b.item_code, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
