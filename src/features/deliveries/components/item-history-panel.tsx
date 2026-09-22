"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeliveryItem } from "@/types/schema";
import { useItemHistory } from "../hooks/use-item-history";
import { useUpdateItemQuantity } from "../hooks/use-update-item-quantity";
import { formatQuantity } from "../lib/format";

interface ItemHistoryPanelProps {
  item: DeliveryItem;
}

// Expanded panel under a search-result item row (virtual-item-list.tsx): a
// quantity-correction form wired to PATCH .../items/:item_id, plus the
// resulting audit trail (frontend-contract.md §8). Only mounted while the
// row is expanded, so the history query (useItemHistory) stays lazy.
export function ItemHistoryPanel({ item }: ItemHistoryPanelProps) {
  const [draftQuantity, setDraftQuantity] = useState(String(item.quantity ?? ""));
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { history, isLoading } = useItemHistory(item.delivery_code, item.id, true);
  const { updateQuantity, isPending } = useUpdateItemQuantity();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = Number(draftQuantity);
    if (draftQuantity.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      setFormError("Enter a valid quantity");
      return;
    }

    try {
      await updateQuantity(item.delivery_code, item.id, {
        quantity: parsed,
        reason: reason.trim() || null,
      });
      setReason("");
    } catch {
      setFormError("Couldn't save that change — try again.");
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-2">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`qty-${item.id}`} className="text-xs font-medium text-muted-foreground">
            Correct quantity
          </label>
          <Input
            id={`qty-${item.id}`}
            value={draftQuantity}
            onChange={(event) => setDraftQuantity(event.target.value)}
            inputMode="decimal"
            aria-invalid={Boolean(formError)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`reason-${item.id}`} className="text-xs font-medium text-muted-foreground">
            Reason (optional)
          </label>
          <Input
            id={`reason-${item.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. recount"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Save"}
        </Button>
      </form>
      {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">History</span>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No corrections yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((entry) => (
              <li key={entry.id} className="text-xs text-muted-foreground">
                {formatQuantity(entry.previous_quantity, item.unit)} →{" "}
                {formatQuantity(entry.new_quantity, item.unit)}
                {" · "}
                {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
