"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseDeliveryDraftResult } from "../hooks/use-delivery-draft";
import { ItemRowEditor } from "./item-row-editor";

interface ReviewStepProps {
  draft: UseDeliveryDraftResult;
  onCancel: () => void;
}

// Thin: renders the draft header + item rows. All editing/validation logic
// (mismatch flags, store-mismatch check, confirm) lives in useDeliveryDraft.
export function ReviewStep({ draft, onCancel }: ReviewStepProps) {
  const {
    header,
    items,
    storeMismatch,
    stage,
    updateHeaderField,
    updateItemField,
    addItem,
    removeItem,
    confirm,
  } = draft;
  const isSubmitting = stage === "submitting";

  return (
    <div className="flex flex-col gap-5">
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
              onChange={(event) => updateHeaderField("delivery_date", event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receipt-store-code">Receipt &quot;To&quot; store code</Label>
          <Input
            id="receipt-store-code"
            value={header.receipt_store_code}
            onChange={(event) => updateHeaderField("receipt_store_code", event.target.value)}
          />
        </div>

        {storeMismatch ? (
          <Alert className="border-amber-500/50">
            <AlertTriangle className="text-amber-600 dark:text-amber-400" />
            <AlertTitle>Store mismatch</AlertTitle>
            <AlertDescription>
              The receipt&apos;s store code doesn&apos;t match this session. You can still log
              it here if that&apos;s intended.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Items ({items.length})</span>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add item
          </Button>
        </div>
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

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={confirm}
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? "Confirming…" : "Confirm delivery"}
        </Button>
      </div>
    </div>
  );
}
