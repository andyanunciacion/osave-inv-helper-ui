"use client";

import { useStoreSession } from "../hooks/use-store-session";
import { SignOutButton } from "./sign-out-button";

// Thin: which store this phone is signed in to, with sign-out. Sits below the
// page's main card, away from the header actions staff tap all day.
export function StoreSessionFooter() {
  const { storeCode } = useStoreSession();

  return (
    <footer className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
      <span>Store {storeCode}</span>
      <span aria-hidden="true">·</span>
      <SignOutButton />
    </footer>
  );
}
