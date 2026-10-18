import { format } from "date-fns";
import { CloudOff } from "lucide-react";

interface SavedCopyNoteProps {
  // When the data on screen was fetched (ms since epoch).
  savedAt: number;
}

// Shown above data that's this phone's saved copy because it couldn't be
// refreshed (frontend-left-to-do.md §4), so staff know how old it is before
// trusting a quantity.
export function SavedCopyNote({ savedAt }: SavedCopyNoteProps) {
  return (
    <p role="status" className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <CloudOff className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Saved on this phone {format(savedAt, "MMM d, h:mm a")}. Couldn&apos;t reach the server to refresh it.
      </span>
    </p>
  );
}
