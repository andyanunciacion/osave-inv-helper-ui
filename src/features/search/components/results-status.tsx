"use client";

import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ResultsStatusProps {
  status: "loading" | "error";
  onRetry: () => void;
}

// Shown in place of the results list while a search is in flight or after
// it failed — never the "No deliveries found" message, which would tell
// staff an item didn't arrive when the request just hadn't come back.
export function ResultsStatus({ status, onRetry }: ResultsStatusProps) {
  if (status === "loading") {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Searching…
      </p>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Couldn&apos;t load results</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>The search didn&apos;t reach the server. Check your connection and try again.</span>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
