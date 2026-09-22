// Small display-formatting helpers shared by search results and the upload
// review screen — both render the same delivery_items fields (§4).

export function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return `₱${value.toFixed(2)}`;
}

// e.g. "2 BOX · 12/box". The per-box count is only shown for boxes — a PIECE
// row's Unit/Box is just 1 and adds nothing. Either half may be missing when
// OCR couldn't read that cell.
export function formatQuantity(
  quantity: number | null,
  unit: string | null,
  unitCount: number | null = null,
): string {
  const amount = quantity === null ? null : unit ? `${quantity} ${unit}` : `${quantity}`;
  const perBox = unitCount !== null && unit !== "PIECE" ? `${unitCount}/box` : null;
  return [amount, perBox].filter(Boolean).join(" · ") || "—";
}

// e.g. "SAN-1074 Laundry Detergent 1kg" — code first, since staff scan by
// code more often than by name.
export function formatItemLabel(itemCode: string | null, itemName: string): string {
  return itemCode ? `${itemCode} ${itemName}` : itemName;
}

// §4: if the arithmetic doesn't roughly match the extracted
// total_item_price, one of the fields was probably misread. On the receipt,
// Total = Qty × Unit/Box × Sales Price (the price is per piece). A small
// relative tolerance absorbs rounding on the printed total. With any of the
// four missing there's nothing to compare — blank cells are highlighted
// separately.
export function hasPriceMismatch(
  quantity: number | null,
  unitCount: number | null,
  itemPrice: number | null,
  totalItemPrice: number | null,
): boolean {
  if (quantity === null || unitCount === null || itemPrice === null || totalItemPrice === null) {
    return false;
  }
  const computed = quantity * unitCount * itemPrice;
  const tolerance = Math.max(0.5, computed * 0.02);
  return Math.abs(computed - totalItemPrice) > tolerance;
}
