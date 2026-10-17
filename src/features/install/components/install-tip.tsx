"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "../hooks/use-install-prompt";

// Thin: which tip to show (if any) comes from useInstallPrompt.
export function InstallTip() {
  const { tip, install, dismiss } = useInstallPrompt();

  if (!tip) return null;

  return (
    <Alert role="status">
      <Download aria-hidden="true" />
      <AlertTitle>Install Inventory Helper</AlertTitle>
      <AlertDescription>
        {tip === "ios-steps" ? (
          <p>
            Tap <Share className="inline size-4 align-text-bottom" aria-hidden="true" /> Share, then{" "}
            <SquarePlus className="inline size-4 align-text-bottom" aria-hidden="true" /> Add to Home Screen, to
            open it like an app.
          </p>
        ) : (
          <p>Add it to your home screen to open it like an app.</p>
        )}
      </AlertDescription>
      {tip === "install-button" ? (
        <Button
          variant="outline"
          className="col-start-2 mt-2 w-full sm:w-auto sm:justify-self-start"
          onClick={install}
        >
          Install app
        </Button>
      ) : null}
      <AlertAction>
        <Button variant="ghost" size="icon" aria-label="Dismiss install tip" onClick={dismiss}>
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
