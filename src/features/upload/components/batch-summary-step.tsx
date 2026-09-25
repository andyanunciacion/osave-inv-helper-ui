"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateDeliveryResult } from "@/features/deliveries/types";

export interface SavedPage {
  // Position within the batch (0-based), so the summary can label pages and
  // stay correct if the same page is recorded twice.
  index: number;
  result: CreateDeliveryResult;
}

// The single success screen at the end of an upload: per-page breakdown plus
// totals. Pages are saved as they're confirmed, so this only reports.
export function BatchSummaryStep({
  pages,
  onUploadAnother,
}: {
  pages: SavedPage[];
  onUploadAnother: () => void;
}) {
  const totalItems = pages.reduce((sum, page) => sum + page.result.acceptedItems.length, 0);
  const totalRejected = pages.reduce((sum, page) => sum + page.result.rejectedItems.length, 0);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-card-foreground">
          {pages.length} page{pages.length === 1 ? "" : "s"} saved with {totalItems} item
          {totalItems === 1 ? "" : "s"}
        </p>
        {totalRejected > 0 ? (
          <p className="text-xs text-muted-foreground">
            {totalRejected} row{totalRejected === 1 ? "" : "s"} rejected as duplicate item codes
          </p>
        ) : null}
      </div>

      <ul className="flex w-full flex-col gap-1 text-left text-xs text-muted-foreground">
        {pages.map(({ index, result }) => (
          <li key={index} className="flex justify-between gap-2 rounded-md border px-3 py-2">
            <span>
              Page {index + 1} · {result.delivery?.delivery_code}
            </span>
            <span>
              {result.acceptedItems.length} item{result.acceptedItems.length === 1 ? "" : "s"}
              {result.rejectedItems.length > 0 ? `, ${result.rejectedItems.length} rejected` : ""}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/search" />}
        >
          Back to search
        </Button>
        <Button type="button" onClick={onUploadAnother}>
          Upload another
        </Button>
      </div>
    </div>
  );
}
