// Cross-component types for the search feature (§6 flow C, AI_DOCS/main-file.md).

export type QuickRangeKey =
  | "yesterday"
  | "last-3-days"
  | "last-7-days"
  | "last-30-days"
  | "last-month";

export interface QuickRangeOption {
  key: QuickRangeKey;
  label: string;
}

// Mirrors the subset of `deliveries` (§4) needed to render a quick-select
// chip: delivery_code + delivery_date, plus a display-only item count.
export interface RecentUpload {
  deliveryCode: string;
  deliveryDate: string;
  itemCount: number;
}
