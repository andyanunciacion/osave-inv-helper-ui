"use client";

import { RefreshCw, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "../hooks/use-app-update";

// Thin: whether a new version is waiting comes from useAppUpdate. Pinned to
// the bottom of the screen, above the iPhone home indicator.
export function AppUpdateBanner() {
  const { updateReady, reload, dismiss } = useAppUpdate();

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <Alert role="status" className="w-full max-w-md shadow-lg">
        <RefreshCw aria-hidden="true" />
        <AlertTitle>Update ready</AlertTitle>
        <AlertDescription>
          <p>Reload to use the new version. Finish the receipt you&apos;re on first.</p>
        </AlertDescription>
        <Button className="col-start-2 mt-2 w-full sm:w-auto sm:justify-self-start" onClick={reload}>
          Reload
        </Button>
        <AlertAction>
          <Button variant="ghost" size="icon" aria-label="Dismiss update notice" onClick={dismiss}>
            <X aria-hidden="true" />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
