"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedPage } from "../types";
import { MergedItemsNotice } from "./merged-items-notice";

// The single end screen of an upload: per-page breakdown plus totals. Pages
// are saved as they're confirmed, so this only reports.
export function BatchSummaryStep({
  pages,
  skippedPages,
  batchSize,
  onUploadAnother,
}: {
  pages: SavedPage[];
  // Batch pages passed over because their save added nothing.
  skippedPages: number[];
  // How many photos the upload had. "Page N" only means something for a
  // multi-photo batch — on a single photo that added a later page to an
  // existing delivery, "Page 1" read like the receipt's first page.
  batchSize: number;
  onUploadAnother: () => void;
}) {
  const totalItems = pages.reduce((sum, page) => sum + page.result.acceptedItems.length, 0);
  const totalRejected = pages.reduce((sum, page) => sum + page.result.rejectedItems.length, 0);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {pages.length > 0 ? (
        <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-10 text-amber-500" aria-hidden="true" />
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-card-foreground">
          {pages.length > 0
            ? `${pages.length} page${pages.length === 1 ? "" : "s"} saved with ${totalItems} item${totalItems === 1 ? "" : "s"}`
            : "Nothing new saved"}
        </p>
        {totalRejected > 0 ? (
          <p className="text-xs text-muted-foreground">
            {totalRejected} row{totalRejected === 1 ? "" : "s"} rejected as duplicate item codes
          </p>
        ) : null}
        {skippedPages.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Skipped, nothing new to save:{" "}
            {skippedPages.map((index) => `Page ${index + 1}`).join(", ")}
          </p>
        ) : null}
        {pages.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Receipt has more pages? Upload the next page — its items are added to this delivery.
          </p>
        ) : null}
      </div>

      {pages.length > 0 ? (
        <ul className="flex w-full flex-col gap-1 text-left text-xs text-muted-foreground">
          {pages.map(({ index, result }) => (
            <li key={index} className="flex flex-col gap-2 rounded-md border px-3 py-2">
              <div className="flex justify-between gap-2">
                <span>
                  {batchSize > 1 ? `Page ${index + 1} · ` : ""}
                  {result.delivery?.delivery_code}
                </span>
                <span>
                  {result.acceptedItems.length} item{result.acceptedItems.length === 1 ? "" : "s"}{" "}
                  added
                  {result.rejectedItems.length > 0 ? `, ${result.rejectedItems.length} rejected` : ""}
                </span>
              </div>
              {/* Clean saves auto-advance past the per-page result screen, so
                  this is where a page's merged rows are reported (#21). */}
              {result.mergedItems.length > 0 ? (
                <MergedItemsNotice items={result.mergedItems} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

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
