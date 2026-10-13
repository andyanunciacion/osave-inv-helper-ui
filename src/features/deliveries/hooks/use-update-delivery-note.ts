import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Delivery } from "@/types/schema";
import { updateDeliveryNote } from "../lib/api";
import type { UpdateDeliveryNoteInput } from "../types";

// Public write API for a delivery's note (frontend-contract.md §9). A
// network/server error throws; the caller awaits and catches it.
export interface UseUpdateDeliveryNoteResult {
  updateNote: (deliveryCode: string, input: UpdateDeliveryNoteInput) => Promise<Delivery>;
  isPending: boolean;
}

export function useUpdateDeliveryNote(): UseUpdateDeliveryNoteResult {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ deliveryCode, input }: { deliveryCode: string; input: UpdateDeliveryNoteInput }) =>
      updateDeliveryNote(deliveryCode, input),
    // The note shows on this delivery's search-result card — refetch any
    // cached search/recent list for the store rather than patching each.
    // Returned (not voided) so the save only resolves once the visible list
    // has the new note: the card's editor closes on save, and would otherwise
    // flash the old note until the refetch lands.
    onSuccess: (delivery) => queryClient.invalidateQueries({ queryKey: ["deliveries", delivery.store_code] }),
  });

  return {
    updateNote: (deliveryCode, input) => mutateAsync({ deliveryCode, input }),
    isPending,
  };
}
