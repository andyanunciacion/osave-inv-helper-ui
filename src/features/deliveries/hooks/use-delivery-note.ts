import { useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { Delivery } from "@/types/schema";
import { useUpdateDeliveryNote } from "./use-update-delivery-note";

// The note form (delivery-note-form.tsx) on the upload's success screen and on
// a search-result card: one editable note per delivery, pre-filled with what's
// already saved and replaced on save. Clearing the box and saving removes the
// note.
export const DELIVERY_NOTE_MAX_LENGTH = 500;

export interface DeliveryNoteMessage {
  tone: "error" | "info";
  text: string;
}

export interface UseDeliveryNoteResult {
  draft: string;
  setDraft: (value: string) => void;
  // The draft differs from what's saved, so there's something to send, and
  // there's a connection to send it on.
  canSave: boolean;
  // Offline mode is read-only (frontend-left-to-do.md §4).
  isOffline: boolean;
  // Resolves true once the note is saved, so a caller can close its editor.
  save: () => Promise<boolean>;
  isPending: boolean;
  message: DeliveryNoteMessage | null;
}

function normalizeNote(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function useDeliveryNote(delivery: Delivery): UseDeliveryNoteResult {
  const { updateNote, isPending } = useUpdateDeliveryNote();
  const isOffline = !useOnlineStatus();
  // `?? null`: a backend without the note column yet omits the field.
  const [savedNote, setSavedNote] = useState<string | null>(delivery.note ?? null);
  const [draft, setDraftState] = useState(savedNote ?? "");
  const [message, setMessage] = useState<DeliveryNoteMessage | null>(null);

  const note = normalizeNote(draft);
  const canSave = note !== savedNote && !isOffline;

  // A "Note saved" message would be stale the moment the text changes again.
  const setDraft = (value: string) => {
    setDraftState(value);
    setMessage(null);
  };

  const save = async () => {
    if (!canSave) return false;
    if (note && note.length > DELIVERY_NOTE_MAX_LENGTH) {
      setMessage({ tone: "error", text: `Keep the note under ${DELIVERY_NOTE_MAX_LENGTH} characters.` });
      return false;
    }

    setMessage(null);
    try {
      const updated = await updateNote(delivery.delivery_code, {
        store_code: delivery.store_code,
        note,
      });
      const saved = updated.note ?? null;
      setSavedNote(saved);
      setDraftState(saved ?? "");
      setMessage({ tone: "info", text: saved ? "Note saved." : "Note removed." });
      return true;
    } catch {
      setMessage({ tone: "error", text: "Couldn't save the note — try again." });
      return false;
    }
  };

  return { draft, setDraft, canSave, isOffline, save, isPending, message };
}
