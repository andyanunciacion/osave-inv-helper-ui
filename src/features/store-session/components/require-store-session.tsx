"use client";

import type { ReactNode } from "react";
import { useRequireStoreSession } from "../hooks/use-require-store-session";

// Thin: renders nothing while the redirect (in the hook) is in flight, so a
// store-scoped page never flashes its content when there's no store_code.
export function RequireStoreSession({ children }: { children: ReactNode }) {
  const storeCode = useRequireStoreSession();

  if (!storeCode) return null;

  return <>{children}</>;
}
