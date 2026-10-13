"use client";

import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentUploads } from "../hooks/use-recent-uploads";
import type { RecentUpload } from "../types";

interface RecentUploadsBarProps {
  onSelect: (upload: RecentUpload) => void;
}

// Thin: calls the recent-uploads data hook and renders a vertically
// scrollable quick-select list. No logic of its own beyond that call.
export function RecentUploadsBar({ onSelect }: RecentUploadsBarProps) {
  const { uploads, isLoading } = useRecentUploads();

  // Placeholder rows while loading, so the bar doesn't pop in and push the
  // date chips down under a thumb that's already reaching for them.
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5" aria-hidden="true">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-2 py-0.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (uploads.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Recent uploads
      </span>
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto py-0.5 pr-0.5">
        {uploads.map((upload) => (
          <button
            key={upload.deliveryCode}
            type="button"
            onClick={() => onSelect(upload)}
            className="flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted active:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="text-sm font-medium text-card-foreground">
              {upload.deliveryCode}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(upload.deliveryDate), "MMM d")} ·{" "}
              {upload.itemCount} items
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
