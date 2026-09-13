"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreSession } from "./use-store-session";

// AI_DOCS/main-file.md §6 flow A: every screen past the store-session step
// is scoped to a store_code. Screens that need one call this instead of
// useStoreSession directly, so a missing/cleared code redirects home
// instead of silently querying/uploading against an empty code.
export function useRequireStoreSession(): string | null {
  const { storeCode } = useStoreSession();
  const router = useRouter();

  useEffect(() => {
    if (!storeCode) router.replace("/");
  }, [storeCode, router]);

  return storeCode;
}
