"use client";

import { AlertTriangle, Merge } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { MergedItem } from "@/features/deliveries/types";
import { mergedItemLabel, splitMergedItems } from "../lib/merged-items";

// The receipt printed the same item twice on this page and the backend
// combined the rows (§5 rule 3) — surfaced after save, since that's when the
// merge actually happens. A row where the combined fields disagreed
// (different price/unit/name between the repeats) gets its own, more
// insistent alert: that usually means an item code was misread rather than
// genuinely repeated, and is worth checking against the paper receipt.
export function MergedItemsNotice({ items }: { items: MergedItem[] }) {
  const { clean, disagreed } = splitMergedItems(items);

  return (
    <div className="flex flex-col gap-2 text-left">
      {clean.length > 0 ? (
        <Alert>
          <Merge />
          <AlertTitle>
            {clean.length} item{clean.length === 1 ? "" : "s"} combined
          </AlertTitle>
          <AlertDescription>
            Listed twice on the receipt, so the quantities were added together:{" "}
            {clean.map(mergedItemLabel).join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}
      {disagreed.length > 0 ? (
        <Alert className="border-amber-500/50">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>
            {disagreed.length} combined item{disagreed.length === 1 ? "" : "s"} need a check
          </AlertTitle>
          <AlertDescription>
            These were listed twice with different price, unit, or name, then combined using the
            first row&apos;s values — check them against the receipt:{" "}
            {disagreed.map(mergedItemLabel).join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
