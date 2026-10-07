"use client";

import { useId, type ReactNode } from "react";
import { PenLine, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  DraftItemField,
  DraftItemView,
} from "../hooks/use-delivery-draft";
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

// Thick dashed sky outline + tint: filled in from the receipt's arithmetic,
// not read. aria-invalid (blank) still wins on the border colour.
const INFERRED_CLASS =
  "border-2 border-dashed border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/15";

function Field({
  id,
  label,
  inferred = false,
  className,
  children,
}: {
  id: string;
  label: string;
  inferred?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "gap-1 text-xs",
          inferred
            ? "font-semibold text-sky-700 dark:text-sky-400"
            : "text-muted-foreground",
        )}
      >
        {label}
        {inferred ? (
          <>
            <Sparkles className="size-3" aria-hidden="true" />
            <span className="sr-only">(calculated)</span>
          </>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

// Thin: renders one editable item row. Mismatch flagging (§4) and the
// duplicate-code fallback are computed in useDeliveryDraft, not here.
export function ItemRowEditor({
  item,
  onFieldChange,
  onRemove,
}: ItemRowEditorProps) {
  const idPrefix = useId();
  const fieldId = (field: DraftItemField) => `${idPrefix}-${field}`;
  const isBlank = (field: DraftItemField) => item.blankFields.includes(field);
  const isInferred = (field: InferredField) => item.inferred.includes(field);
  const inferredClass = (field: InferredField) =>
    isInferred(field) ? INFERRED_CLASS : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-end justify-between gap-2">
        <Field
          id={fieldId("item_name")}
          label="Item description"
          className="flex-1"
        >
          <Input
            id={fieldId("item_name")}
            value={item.item_name}
            onChange={(event) => onFieldChange("item_name", event.target.value)}
            aria-invalid={isBlank("item_name")}
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove item"
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field id={fieldId("item_code")} label="Item code">
          <Input
            id={fieldId("item_code")}
            value={item.item_code}
            onChange={(event) => onFieldChange("item_code", event.target.value)}
          />
        </Field>
        <Field
          id={fieldId("unit_count")}
          label="Unit/Box"
          inferred={isInferred("unit_count")}
        >
          <Input
            id={fieldId("unit_count")}
            value={item.unit_count}
            onChange={(event) =>
              onFieldChange("unit_count", event.target.value)
            }
            inputMode="decimal"
            aria-invalid={isBlank("unit_count")}
            className={inferredClass("unit_count")}
          />
        </Field>
        <Field
          id={fieldId("quantity")}
          label="Qty"
          inferred={isInferred("quantity")}
        >
          <Input
            id={fieldId("quantity")}
            value={item.quantity}
            onChange={(event) => onFieldChange("quantity", event.target.value)}
            inputMode="decimal"
            aria-invalid={isBlank("quantity")}
            className={inferredClass("quantity")}
          />
        </Field>
        <Field id={fieldId("unit")} label="UOM" inferred={isInferred("unit")}>
          <Select
            value={item.unit}
            onValueChange={(value) => onFieldChange("unit", String(value))}
          >
            <SelectTrigger
              id={fieldId("unit")}
              className={cn("w-full", inferredClass("unit"))}
              aria-invalid={isBlank("unit")}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BOX">BOX</SelectItem>
              <SelectItem value="PIECE">PIECE</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field
          id={fieldId("item_price")}
          label="Price"
          inferred={isInferred("item_price")}
          className="w-32"
        >
          <Input
            id={fieldId("item_price")}
            value={item.item_price}
            onChange={(event) =>
              onFieldChange("item_price", event.target.value)
            }
            inputMode="decimal"
            aria-invalid={isBlank("item_price")}
            className={inferredClass("item_price")}
          />
        </Field>
        <Field
          id={fieldId("total_item_price")}
          label="Total"
          inferred={isInferred("total_item_price")}
          className="w-32"
        >
          <Input
            id={fieldId("total_item_price")}
            value={item.total_item_price}
            onChange={(event) =>
              onFieldChange("total_item_price", event.target.value)
            }
            inputMode="decimal"
            aria-invalid={isBlank("total_item_price")}
            className={inferredClass("total_item_price")}
          />
        </Field>
        {item.hasMismatch ? (
          <Badge variant="destructive" className="mb-3 md:mb-1.5">
            Qty × Unit/Box × price ≠ total
          </Badge>
        ) : null}
      </div>
      {item.inferred.length > 0 ? (
        <p className="flex items-start gap-1 text-xs text-sky-700 dark:text-sky-400">
          <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>
            {item.inferred.map((field) => FIELD_LABELS[field]).join(", ")}{" "}
            calculated from the receipt&apos;s totals — the cell was crossed out
            or unreadable.
          </span>
        </p>
      ) : null}
      {item.has_annotation ? (
        <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
          <PenLine className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>
            Handwritten note on this row. Qty is the printed amount — change it
            if a different amount arrived.
          </span>
        </p>
      ) : null}
    </div>
  );
}
