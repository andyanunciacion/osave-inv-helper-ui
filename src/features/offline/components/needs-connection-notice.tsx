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
// upload or save button, says why it's disabled.
export function NeedsConnectionNotice({ action, detail, className }: NeedsConnectionNoticeProps) {
  return (
    <p role="status" className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <WifiOff className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>
        You&apos;re offline. {action} needs a connection.{detail ? ` ${detail}` : ""}
      </span>
    </p>
  );
}
