"use client";

import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Delivery } from "@/types/schema";
import {
  DELIVERY_NOTE_MAX_LENGTH,
  useDeliveryNote,
} from "../hooks/use-delivery-note";

interface DeliveryNoteFormProps {
  delivery: Delivery;
  // Set when the form is an editor that opens on demand (a search-result
  // card): it focuses on open, closes after a save, and gets a Cancel button.
  // Without them it's the always-open box on the upload's success screen.
  onSaved?: () => void;
  onCancel?: () => void;
}

// Thin: draft, validation and saving are useDeliveryNote's. The saved note
// shows under the delivery code in search results.
export function DeliveryNoteForm({
  delivery,
  onSaved,
  onCancel,
}: DeliveryNoteFormProps) {
  const { draft, setDraft, canSave, save, isPending, message } =
    useDeliveryNote(delivery);
  const inputId = `note-${delivery.delivery_code}`;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (await save()) onSaved?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 text-left"
    >
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        Note for {delivery.delivery_code} (optional)
      </label>
      <Textarea
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="e.g. 1 create additional, 1 box missing"
        maxLength={DELIVERY_NOTE_MAX_LENGTH}
        autoFocus={Boolean(onCancel)}
        aria-invalid={message?.tone === "error"}
      />
      <div className="flex items-center justify-between gap-2">
        <p
          role={message?.tone === "error" ? "alert" : "status"}
          className={
            message?.tone === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {message?.text}
        </p>
        <div className="flex shrink-0 gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={!canSave || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              "Save note"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
