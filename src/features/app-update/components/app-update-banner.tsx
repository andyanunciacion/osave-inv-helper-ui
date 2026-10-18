"use client";

import { RefreshCw } from "lucide-react";
import { FloatingNotice } from "@/components/floating-notice";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "../hooks/use-app-update";

// Thin: whether a new version is waiting comes from useAppUpdate.
// data-notice lets the install tip step aside while this shows.
export function AppUpdateBanner() {
  const { updateReady, reload, dismiss } = useAppUpdate();

  if (!updateReady) return null;

  return (
    <FloatingNotice
      data-notice="app-update"
      icon={<RefreshCw />}
      title="Update ready"
      description="Finish your receipt first"
      action={
        <Button className="rounded-full" onClick={reload}>
          Reload
        </Button>
      }
      dismissLabel="Dismiss update notice"
      onDismiss={dismiss}
    />
  );
}
