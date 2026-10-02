"use client";

import { PenLine, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DraftItemField, DraftItemView } from "../hooks/use-delivery-draft";
import type { InferredField } from "../types";

interface ItemRowEditorProps {
  item: DraftItemView;
  onFieldChange: (field: DraftItemField, value: string) => void;
  onRemove: () => void;
}

const FIELD_LABELS: Record<InferredField, string> = {
  unit_count: "Unit/Box",
  unit: "UOM",
  quantity: "Qty",
  item_price: "Price",
  total_item_price: "Total",
};

// Dashed outline: filled in from the receipt's arithmetic, not read.
const INFERRED_CLASS = "border-dashed border-sky-600/70 dark:border-sky-400/70";

// Thin: renders one editable item row. Mismatch flagging (§4) and the
// duplicate-code fallback are computed in useDeliveryDraft, not here.
export function ItemRowEditor({ item, onFieldChange, onRemove }: ItemRowEditorProps) {
  const isBlank = (field: DraftItemField) => item.blankFields.includes(field);
  const inferredClass = (field: InferredField) => (item.inferred.includes(field) ? INFERRED_CLASS : undefined);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <Input
          value={item.item_name}
          onChange={(event) => onFieldChange("item_name", event.target.value)}
          placeholder="Item description"
          aria-label="Item name"
          aria-invalid={isBlank("item_name")}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove item"
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input
          value={item.item_code}
          onChange={(event) => onFieldChange("item_code", event.target.value)}
          placeholder="Item code"
          aria-label="Item code"
        />
        <Input
          value={item.unit_count}
          onChange={(event) => onFieldChange("unit_count", event.target.value)}
          placeholder="Unit/Box"
          inputMode="decimal"
          aria-label="Units per box"
          aria-invalid={isBlank("unit_count")}
          className={inferredClass("unit_count")}
        />
        <Input
          value={item.quantity}
          onChange={(event) => onFieldChange("quantity", event.target.value)}
          placeholder="Qty"
          inputMode="decimal"
          aria-label="Quantity"
          aria-invalid={isBlank("quantity")}
          className={inferredClass("quantity")}
        />
        <Select
          value={item.unit}
          onValueChange={(value) => onFieldChange("unit", String(value))}
        >
          <SelectTrigger
            className={cn("w-full", inferredClass("unit"))}
            aria-label="Unit"
            aria-invalid={isBlank("unit")}
          >
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOX">BOX</SelectItem>
            <SelectItem value="PIECE">PIECE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={item.item_price}
          onChange={(event) => onFieldChange("item_price", event.target.value)}
          placeholder="Price"
          inputMode="decimal"
          aria-label="Unit price"
          aria-invalid={isBlank("item_price")}
          className={cn("max-w-32", inferredClass("item_price"))}
        />
        <Input
          value={item.total_item_price}
          onChange={(event) => onFieldChange("total_item_price", event.target.value)}
          placeholder="Total"
          inputMode="decimal"
          aria-label="Total price"
          aria-invalid={isBlank("total_item_price")}
          className={cn("max-w-32", inferredClass("total_item_price"))}
        />
        {item.hasMismatch ? (
          <Badge variant="destructive">Qty × Unit/Box × price ≠ total</Badge>
        ) : null}
      </div>
      {item.inferred.length > 0 ? (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>
            {item.inferred.map((field) => FIELD_LABELS[field]).join(", ")} calculated from the
            receipt&apos;s totals — the cell was crossed out or unreadable.
          </span>
        </p>
      ) : null}
      {item.has_annotation ? (
        <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
          <PenLine className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>
            Handwritten note on this row. Qty is the printed amount — change it if a different
            amount arrived.
          </span>
        </p>
      ) : null}
    </div>
  );
}
