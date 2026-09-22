"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Merge, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CreateDeliveryResult, MergedItem } from "@/features/deliveries/types";

interface ResultStepProps {
  result: CreateDeliveryResult;
  onEditAgain: () => void;
  onUploadAnother: () => void;
}

// The receipt printed the same item twice on this page and the backend
// combined the rows (§5 rule 3) — surfaced here, after save, since that's
// when the merge actually happens. A row where the combined fields
// disagreed (different price/unit/name between the repeats) gets its own,
// more insistent alert: that usually means an item code was misread rather
// than genuinely repeated, and is worth checking against the paper receipt.
function MergedItemsNotice({ items }: { items: MergedItem[] }) {
  const disagreed = items.filter((item) => item.fieldsDisagreed);
  const clean = items.filter((item) => !item.fieldsDisagreed);

  const label = (item: MergedItem) =>
    `${item.item_code ?? item.item_name} (${item.mergedCount} rows combined)`;

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
            {clean.map(label).join(", ")}.
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
            {disagreed.map(label).join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

// Thin: renders the outcome of useDeliveryDraft's confirm() — §6 flow B
// step 5 calls for duplicates to be surfaced clearly, not as a silent
// failure, whether it's the whole receipt or individual item rows.
export function ResultStep({ result, onEditAgain, onUploadAnother }: ResultStepProps) {
  if (result.status === "store_mismatch") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <XCircle className="size-10 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-card-foreground">
            This receipt is for a different store
          </p>
          <p className="text-xs text-muted-foreground">
            Nothing was saved. Check the store code printed after &quot;To:&quot; on the
            receipt, or switch to the right store.
          </p>
        </div>
        <Button type="button" onClick={onEditAgain}>
          Back to review
        </Button>
      </div>
    );
  }

  // The backend appends a later page of the same receipt (same Inv. Tran.
  // No., same store) to the delivery already saved, so reaching this branch
  // means either this exact page was already uploaded, or the code belongs to
  // another store's delivery.
  if (result.status === "duplicate_delivery") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <XCircle className="size-10 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-card-foreground">
            Nothing new to save
          </p>
          <p className="text-xs text-muted-foreground">
            This page was already uploaded, or the Inv. Tran. No. belongs to another store&apos;s
            delivery. Check the number against the receipt and try again.
          </p>
        </div>
        <Button type="button" onClick={onEditAgain}>
          Back to review
        </Button>
      </div>
    );
  }

  const isPartial = result.status === "partial";

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {isPartial ? (
        <AlertTriangle className="size-10 text-amber-500" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-card-foreground">
          {result.delivery?.delivery_code} saved with {result.acceptedItems.length} item
          {result.acceptedItems.length === 1 ? "" : "s"}
        </p>
        {result.rejectedItems.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {result.rejectedItems.length} row{result.rejectedItems.length === 1 ? "" : "s"}{" "}
            rejected as duplicate item codes:{" "}
            {result.rejectedItems.map((item) => item.item_code ?? item.item_name).join(", ")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Receipt has more pages? Upload the next page — its items are added to this delivery.
        </p>
      </div>

      {result.mergedItems.length > 0 ? <MergedItemsNotice items={result.mergedItems} /> : null}
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
          Upload another page
        </Button>
      </div>
    </div>
  );
}
