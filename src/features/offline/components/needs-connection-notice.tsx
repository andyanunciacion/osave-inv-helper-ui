import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeedsConnectionNoticeProps {
  // What's waiting on the connection, e.g. "Uploading receipts".
  action: string;
  // Anything kept meanwhile, e.g. "Your edits stay here."
  detail?: string;
  className?: string;
}

// Offline mode is read-only (frontend-left-to-do.md §4): next to a disabled
// upload or save button, says why it's disabled. An amber callout, like the
// review screen's other warnings, so a greyed-out button is never the only
// sign — it's a temporary state, not an error.
export function NeedsConnectionNotice({ action, detail, className }: NeedsConnectionNoticeProps) {
  return (
    <p
      role="status"
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        className,
      )}
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">You&apos;re offline.</span> {action} needs a connection.
        {detail ? ` ${detail}` : ""}
      </span>
    </p>
  );
}
