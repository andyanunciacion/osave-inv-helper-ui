"use client";

import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSignOut } from "../hooks/use-sign-out";
import { useStoreSession } from "../hooks/use-store-session";

// Thin: the confirm dialog + a call into useSignOut. Confirmed first because
// signing back in needs the passcode or QR code, which staff may not have
// to hand.
export function SignOutButton() {
  const { storeCode } = useStoreSession();
  const { signOut } = useSignOut();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of store {storeCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need the store passcode or QR code to sign back in on this phone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay signed in</AlertDialogCancel>
          <AlertDialogAction onClick={signOut}>Sign out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
