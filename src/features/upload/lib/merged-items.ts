import type { CreateDeliveryResult, MergedItem } from "@/features/deliveries/types";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

// A merge whose kept fields disagreed (different price/unit/name between the
// repeats) usually means a misread item code rather than a genuine repeat,
// so it's shown apart from the clean ones.
export function splitMergedItems(items: MergedItem[]): { clean: MergedItem[]; disagreed: MergedItem[] } {
  return {
    clean: items.filter((item) => !item.fieldsDisagreed),
    disagreed: items.filter((item) => item.fieldsDisagreed),
  };
}

export function mergedItemLabel(item: MergedItem): string {
  return `${item.item_code ?? item.item_name} (${item.mergedCount} rows combined)`;
}

// The banner on the next page of a batch after a page auto-advances — the
// only place a merge on a mid-batch page is mentioned before the summary.
export function savedPageNotice(pageNumber: number, result: CreateDeliveryResult): string {
  const notice = `Page ${pageNumber} saved — ${plural(result.acceptedItems.length, "item")}`;
  const merged = result.mergedItems.length;
  return merged > 0 ? `${notice} · ${plural(merged, "item")} combined` : notice;
}
