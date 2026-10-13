"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheck, Plus, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/features/deliveries/lib/format";
import { cn } from "@/lib/utils";
import type { UseDeliveryDraftResult } from "../hooks/use-delivery-draft";
import type { TotalsMismatch } from "../lib/receipt-totals";
import { INFERRED_CLASS, ItemRowEditor } from "./item-row-editor";

function describeMismatch({ kind, printed, counted }: TotalsMismatch): string {
  switch (kind) {
    case "item_count":
      return `The receipt lists ${printed} items, but there are ${counted} here — a row may be missing.`;
    case "total_box":
      return `Total Box on the receipt is ${printed}; the BOX rows' Qty add up to ${counted}.`;
    case "total_pcs":
      return `Total Pcs on the receipt is ${printed}; the PIECE rows' Qty add up to ${counted}.`;
    case "total_value":
      return `Total Value on the receipt is ${formatCurrency(printed)}; the rows add up to ${formatCurrency(counted)}.`;
  }
}

interface ReviewStepProps {
  draft: UseDeliveryDraftResult;
  onCancel: () => void;
  // Set on a multi-photo upload; null for a single photo, where there's
  // nothing to number.
  pageLabel?: string | null;
  // "Page 1 saved — 7 items" after a batch auto-advances to the next page.
  savedNotice?: string | null;
  // This page plus any after it in the batch — what Cancel would discard.
  unsavedPageCount?: number;
  // Earlier pages of the batch already saved; Cancel keeps those.
  hasSavedPages?: boolean;
  // True when this page's receipt_store_code was blank in the photo and
  // came from /api/ocr/reconcile instead of being read directly — worth a
  // glance since it's a guess based on a sibling page, not an OCR read.
  receiptStoreCodeInferred?: boolean;
}

// Thin: renders the draft header + item rows. All editing/validation logic
// (mismatch flags, store-mismatch check, confirm) lives in useDeliveryDraft.
export function ReviewStep({
  draft,
  onCancel,
  pageLabel,
  savedNotice,
  unsavedPageCount = 1,
  hasSavedPages = false,
  receiptStoreCodeInferred,
}: ReviewStepProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const {
    header,
    items,
    storeMismatch,
    missingReceiptStoreCode,
    missingDeliveryDate,
    unnamedRowCount,
    blankFieldCount,
    totalsCheck,
    canConfirm,
    stage,
    submitError,
    updateHeaderField,
    updateItemField,
    addItem,
    removeItem,
    confirm,
  } = draft;
  const isSubmitting = stage === "submitting";

  return (
    <div className="flex flex-col gap-5">
      {savedNotice ? (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          {savedNotice}
        </p>
      ) : null}
      {pageLabel ? (
        <Badge variant="secondary" className="w-fit">
          {pageLabel}
        </Badge>
      ) : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delivery-code" className="text-sm font-semibold">
            Inv. Tran. No. (delivery code)
          </Label>
          <Input
            id="delivery-code"
            value={header.delivery_code}
            onChange={(event) => updateHeaderField("delivery_code", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This is the primary identifier — double-check it against the receipt.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-code">Warehouse</Label>
            <Input
              id="warehouse-code"
              value={header.warehouse_code}
              onChange={(event) => updateHeaderField("warehouse_code", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery-date">Transaction date</Label>
            <Input
              id="delivery-date"
              type="date"
              value={header.delivery_date}
              aria-invalid={missingDeliveryDate}
              onChange={(event) => updateHeaderField("delivery_date", event.target.value)}
            />
          </div>
        </div>
        {missingDeliveryDate ? (
          <p className="-mt-1.5 text-xs text-destructive">
            Transaction date is required — copy it from the receipt.
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receipt-store-code">Receipt &quot;To&quot; store code</Label>
          <Input
            id="receipt-store-code"
            value={header.receipt_store_code}
            aria-invalid={missingReceiptStoreCode || storeMismatch}
            className={cn(receiptStoreCodeInferred && !missingReceiptStoreCode && INFERRED_CLASS)}
            onChange={(event) => updateHeaderField("receipt_store_code", event.target.value)}
          />
          {missingReceiptStoreCode ? (
            <p className="text-xs text-destructive">
              Required — type the store number printed after &quot;To:&quot; on the receipt.
            </p>
          ) : receiptStoreCodeInferred ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3" aria-hidden="true" />
              Couldn&apos;t be read on this photo — filled in from another page in this batch.
              Double-check it.
            </p>
          ) : null}
        </div>

        {storeMismatch ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Wrong store</AlertTitle>
            <AlertDescription>
              This receipt is addressed to a different store than this session, so it
              can&apos;t be saved here. If the code was misread, correct it above; otherwise
              start over with the right receipt.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Items ({items.length})</span>
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="size-4" aria-hidden="true" />
            Add item
          </Button>
        </div>
        {blankFieldCount > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>
              {blankFieldCount} field{blankFieldCount === 1 ? "" : "s"} couldn&apos;t be read
            </AlertTitle>
            <AlertDescription>
              They&apos;re outlined in red, at the top of the list. Fill them in from the receipt
              (or remove the row) before confirming.
            </AlertDescription>
          </Alert>
        ) : null}
        {unnamedRowCount > 0 ? (
          <Alert className="border-amber-500/50">
            <AlertTriangle className="text-amber-600 dark:text-amber-400" />
            <AlertTitle>
              {unnamedRowCount} row{unnamedRowCount === 1 ? "" : "s"} missing a description
            </AlertTitle>
            <AlertDescription>
              Add the item name from the receipt, or remove the row, before confirming.
            </AlertDescription>
          </Alert>
        ) : null}
        {totalsCheck.mismatches.length > 0 ? (
          <Alert className="border-amber-500/50">
            <AlertTriangle className="text-amber-600 dark:text-amber-400" />
            <AlertTitle>Doesn&apos;t match the receipt&apos;s printed totals</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {totalsCheck.mismatches.map((mismatch) => (
                  <li key={mismatch.kind}>{describeMismatch(mismatch)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : totalsCheck.checked > 0 ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CircleCheck className="size-3" aria-hidden="true" />
            Matches the totals printed on the receipt.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemRowEditor
              key={item.localId}
              item={item}
              onFieldChange={(field, value) => updateItemField(item.localId, field, value)}
              onRemove={() => removeItem(item.localId)}
            />
          ))}
        </div>
      </div>

      {submitError ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setConfirmingCancel(true)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={confirm}
          disabled={isSubmitting || !canConfirm}
        >
          {isSubmitting ? "Confirming…" : "Confirm delivery"}
        </Button>
      </div>

      {/* Every page here was a billed OCR read and may carry typed fixes, so
          discarding is never a single tap. */}
      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unsavedPageCount > 1 ? `Discard ${unsavedPageCount} unsaved pages?` : "Discard this receipt?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedPageCount > 1 ? "Their" : "Its"} photos will need to be read again, and any
              changes you typed are lost.
              {hasSavedPages ? " Pages you already confirmed stay saved." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            {/* Darker reds: the destructive variant's text is ~4:1 on its tint. */}
            <AlertDialogAction
              variant="destructive"
              className="text-red-700 dark:text-red-300"
              onClick={onCancel}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
