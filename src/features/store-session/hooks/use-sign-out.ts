"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearStoreSession } from "@/lib/store-session-storage";

export interface UseSignOutResult {
  signOut: () => void;
}

// Signing out drops the store code and passcode from this phone, so whoever
// picks it up next needs the passcode or the store's QR code to get back in
// (AI_DOCS/frontend-left-to-do.md §8). Cached deliveries go too, so that
// store's data doesn't stay in memory after sign-out.
export function useSignOut(): UseSignOutResult {
  const queryClient = useQueryClient();
  const router = useRouter();

  return {
    signOut: () => {
      router.replace("/");
      clearStoreSession();
      queryClient.clear();
    },
  };
}
