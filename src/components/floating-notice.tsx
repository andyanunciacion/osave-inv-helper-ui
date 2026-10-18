"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingNoticeProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  // The notice's one action button, e.g. Reload or Install.
  action: React.ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
}

// A slim pill floating above the bottom of the screen (and the iPhone home
// indicator), so showing or hiding it never pushes the page around. The
// spacer it leaves at its spot in the page lets the content scroll clear of
// it. Shared by the install tip and the update notice.
export function FloatingNotice({
  icon,
  title,
  description,
  action,
  dismissLabel,
  onDismiss,
  ...props
}: FloatingNoticeProps) {
  return (
    <div {...props}>
      <div aria-hidden="true" className="h-16 shrink-0" />
      {/* z-40: popovers and dialogs (z-50) open above the pill. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-3xl border bg-popover py-1.5 pr-1.5 pl-4 text-popover-foreground shadow-lg md:py-1"
        >
          <span className="shrink-0 text-muted-foreground [&_svg]:size-5" aria-hidden="true">
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {action}
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={dismissLabel} onClick={onDismiss}>
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
