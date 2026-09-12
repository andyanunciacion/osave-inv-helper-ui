import { useCallback } from "react";
import { createDelivery } from "../lib/sample-store";
import type { CreateDeliveryResult, NewDeliveryInput } from "../types";

// Public write API for the deliveries feature — upload's review screen
// calls this on confirm. Kept as a thin wrapper around the sample store so
// callers never reach into ../lib directly, which is what will make this
// swap-in-place for a real `useMutation` against Supabase later.
export interface UseCreateDeliveryResult {
  submitDelivery: (input: NewDeliveryInput) => CreateDeliveryResult;
}

export function useCreateDelivery(): UseCreateDeliveryResult {
  const submitDelivery = useCallback((input: NewDeliveryInput) => {
    return createDelivery(input);
  }, []);

  return { submitDelivery };
}
