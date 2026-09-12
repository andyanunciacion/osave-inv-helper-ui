"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateDeliveryResult } from "@/features/deliveries/types";

interface ResultStepProps {
  result: CreateDeliveryResult;
  onEditAgain: () => void;
  onUploadAnother: () => void;
}

// Thin: renders the outcome of useDeliveryDraft's confirm() — §6 flow B
// step 5 calls for duplicates to be surfaced clearly, not as a silent
// failure, whether it's the whole receipt or individual item rows.
export function ResultStep({ result, onEditAgain, onUploadAnother }: ResultStepProps) {
  if (result.status === "duplicate_delivery") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <XCircle className="size-10 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-card-foreground">
            This delivery code already exists
          </p>
          <p className="text-xs text-muted-foreground">
            Nothing was saved. Check the Inv. Tran. No. against the receipt and try again.
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
      </div>
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
