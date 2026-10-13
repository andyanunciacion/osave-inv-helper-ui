import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeliveryRequest } from "../lib/api";
import type { CreateDeliveryResult, NewDeliveryInput } from "../types";

// Public write API for the deliveries feature — upload's review screen
// calls this on confirm. A network/server error throws (the caller awaits
// and catches it); a domain-level rejection (duplicate delivery, duplicate
// items) is a normal resolved CreateDeliveryResult, not an error.
export interface UseCreateDeliveryResult {
  submitDelivery: (input: NewDeliveryInput) => Promise<CreateDeliveryResult>;
}

export function useCreateDelivery(): UseCreateDeliveryResult {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: createDeliveryRequest,
    onSuccess: (result, input) => {
      // Nothing was written in either case, so there's nothing to refresh.
      if (result.status === "duplicate_delivery" || result.status === "store_mismatch") return;
      // Recent uploads / search results may already be on screen (e.g. via
      // the recent-uploads bar) — invalidate rather than trying to patch
      // every cached list by hand.
      void queryClient.invalidateQueries({ queryKey: ["deliveries", input.store_code] });
    },
  });

  return { submitDelivery: mutateAsync };
}
