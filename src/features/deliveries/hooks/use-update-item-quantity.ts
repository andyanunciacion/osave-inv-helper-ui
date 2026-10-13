import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItemQuantity } from "../lib/api";
import type { UpdateItemQuantityInput, UpdateItemQuantityResult } from "../types";

// Public write API for a single item's quantity correction
// (item-history-panel.tsx). A network/server error throws (the caller
// awaits and catches it); resubmitting the same quantity is a normal
// resolved result with `update: null`, not an error.
export interface UseUpdateItemQuantityResult {
  updateQuantity: (
    deliveryCode: string,
    itemId: string,
    input: UpdateItemQuantityInput,
  ) => Promise<UpdateItemQuantityResult>;
  isPending: boolean;
}

export function useUpdateItemQuantity(): UseUpdateItemQuantityResult {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({
      deliveryCode,
      itemId,
      input,
    }: {
      deliveryCode: string;
      itemId: string;
      input: UpdateItemQuantityInput;
    }) => updateItemQuantity(deliveryCode, itemId, input),
    onSuccess: (result) => {
      // The item's new quantity needs to show up wherever it's cached
      // (search results, recent uploads) and its history panel needs the
      // new entry — invalidate rather than trying to patch every cached
      // list by hand.
      void queryClient.invalidateQueries({ queryKey: ["deliveries", result.item.store_code] });
      void queryClient.invalidateQueries({
        queryKey: ["deliveries", "item-history", result.item.delivery_code, result.item.id],
      });
    },
  });

  return {
    updateQuantity: (deliveryCode, itemId, input) => mutateAsync({ deliveryCode, itemId, input }),
    isPending,
  };
}
