import { useState } from "react";
import type { DeliveryItem } from "@/types/schema";
import { useUpdateItemQuantity } from "./use-update-item-quantity";

// The quantity-correction form's rules (item-history-panel.tsx): parse and
// validate the typed amount, skip the request when it matches what's
// already saved, and turn the outcome into a message for the form.
export type QuantityCorrectionOutcome = "saved" | "unchanged" | "invalid" | "failed";

export interface QuantityCorrectionMessage {
  tone: "error" | "info";
  text: string;
}

export interface UseQuantityCorrectionResult {
  submit: (draftQuantity: string, reason: string) => Promise<QuantityCorrectionOutcome>;
  isPending: boolean;
  message: QuantityCorrectionMessage | null;
}

function parseQuantity(draft: string): number | null {
  if (!draft.trim()) return null;
  const parsed = Number(draft);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function useQuantityCorrection(item: DeliveryItem): UseQuantityCorrectionResult {
  const { updateQuantity, isPending } = useUpdateItemQuantity();
  const [message, setMessage] = useState<QuantityCorrectionMessage | null>(null);

  const submit = async (draftQuantity: string, reason: string): Promise<QuantityCorrectionOutcome> => {
    const quantity = parseQuantity(draftQuantity);
    if (quantity === null) {
      setMessage({ tone: "error", text: "Enter a valid quantity" });
      return "invalid";
    }
    // The backend would accept it and log nothing, so don't send it at all.
    if (quantity === item.quantity) {
      setMessage({ tone: "info", text: "That's already the saved quantity — nothing changed." });
      return "unchanged";
    }

    setMessage(null);
    try {
      await updateQuantity(item.delivery_code, item.id, {
        quantity,
        reason: reason.trim() || null,
      });
      return "saved";
    } catch {
      setMessage({ tone: "error", text: "Couldn't save that change — try again." });
      return "failed";
    }
  };

  return { submit, isPending, message };
}
