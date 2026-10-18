"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { FloatingNotice } from "@/components/floating-notice";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInstallPrompt } from "../hooks/use-install-prompt";

// Thin: which tip to show (if any) comes from useInstallPrompt. Hidden while
// the update notice (AppUpdateBanner) holds the bottom of the screen.
export function InstallTip() {
  const { tip, install, dismiss } = useInstallPrompt();

  if (!tip) return null;

  return (
    <FloatingNotice
      className="[body:has([data-notice=app-update])_&]:hidden"
      icon={<Download />}
      title="Install this app"
      description="Add it to your home screen"
      action={
        tip === "install-button" ? (
          <Button variant="outline" className="rounded-full" onClick={install}>
            Install
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="rounded-full" />}>How?</PopoverTrigger>
            <PopoverContent side="top" sideOffset={12}>
              <p>
                Tap <Share className="inline size-4 align-text-bottom" aria-hidden="true" /> Share, then{" "}
                <SquarePlus className="inline size-4 align-text-bottom" aria-hidden="true" /> Add to Home Screen, to
                open it like an app.
              </p>
            </PopoverContent>
          </Popover>
        )
      }
      dismissLabel="Dismiss install tip"
      onDismiss={dismiss}
    />
  );
}
