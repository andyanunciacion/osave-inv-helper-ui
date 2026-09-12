"use client";

import { Trash2 } from "lucide-react";
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
import type { DraftItemField, DraftItemView } from "../hooks/use-delivery-draft";

interface ItemRowEditorProps {
  item: DraftItemView;
  onFieldChange: (field: DraftItemField, value: string) => void;
  onRemove: () => void;
}

// Thin: renders one editable item row. Mismatch flagging (§4) and the
// duplicate-code fallback are computed in useDeliveryDraft, not here.
export function ItemRowEditor({ item, onFieldChange, onRemove }: ItemRowEditorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <Input
          value={item.item_name}
          onChange={(event) => onFieldChange("item_name", event.target.value)}
          placeholder="Item description"
          aria-label="Item name"
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
          value={item.quantity}
          onChange={(event) => onFieldChange("quantity", event.target.value)}
          placeholder="Qty"
          inputMode="decimal"
          aria-label="Quantity"
        />
        <Select
          value={item.unit}
          onValueChange={(value) => onFieldChange("unit", String(value))}
        >
          <SelectTrigger className="w-full" aria-label="Unit">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOX">BOX</SelectItem>
            <SelectItem value="PIECE">PIECE</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={item.item_price}
          onChange={(event) => onFieldChange("item_price", event.target.value)}
          placeholder="Price"
          inputMode="decimal"
          aria-label="Unit price"
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={item.total_item_price}
          onChange={(event) => onFieldChange("total_item_price", event.target.value)}
          placeholder="Total"
          inputMode="decimal"
          aria-label="Total price"
          className="max-w-32"
        />
        {item.hasMismatch ? (
          <Badge variant="destructive">Qty × price ≠ total</Badge>
        ) : null}
      </div>
    </div>
  );
}
