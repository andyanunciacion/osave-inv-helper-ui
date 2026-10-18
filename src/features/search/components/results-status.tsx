"use client";

import { AlertTriangle, Loader2, RotateCw, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ResultsStatusProps {
  status: "loading" | "offline" | "error";
  onRetry: () => void;
}

// Shown in place of the results list while a search is in flight, waiting
// for a connection, or after it failed — never the "No deliveries found"
// message, which would tell staff an item didn't arrive when the request
// just hadn't come back.
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

  // Offline with no saved copy: a search already run on this phone would
  // show its saved results instead (frontend-left-to-do.md §4). Never "No
  // deliveries found", which would read as "not delivered". The query
  // resumes on its own once the connection is back, so this is a wait, not a
  // failure. No Try again button: a manual refetch just rejoins the same
  // paused fetch, so it would do nothing.
  if (status === "offline") {
    return (
      <Alert role="status">
        <WifiOff />
        <AlertTitle>This search isn&apos;t saved on this phone</AlertTitle>
        <AlertDescription>
          Connect to search. It&apos;ll run by itself as soon as you&apos;re back online.
        </AlertDescription>
      </Alert>
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
