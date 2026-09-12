// Small display-formatting helpers shared by search results and the upload
// review screen — both render the same delivery_items fields (§4).

export function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return `₱${value.toFixed(2)}`;
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) return "—";
  return unit ? `${quantity} ${unit}` : `${quantity}`;
}

// e.g. "SAN-1074 Laundry Detergent 1kg" — code first, since staff scan by
// code more often than by name.
export function formatItemLabel(itemCode: string | null, itemName: string): string {
  return itemCode ? `${itemCode} ${itemName}` : itemName;
}

// §4: "if quantity × item_price doesn't roughly match the extracted
// total_item_price, that's a signal one of the three fields was misread."
// A small relative tolerance absorbs rounding on the printed total.
export function hasPriceMismatch(
  quantity: number | null,
  itemPrice: number | null,
  totalItemPrice: number | null,
): boolean {
  if (quantity === null || itemPrice === null || totalItemPrice === null) return false;
  const computed = quantity * itemPrice;
  const tolerance = Math.max(0.5, computed * 0.02);
  return Math.abs(computed - totalItemPrice) > tolerance;
}
