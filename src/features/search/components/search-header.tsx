import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

// Thin: pure navigation, no business logic.
export function SearchHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="icon-lg"
        className="md:size-8"
        aria-label="Back to store code"
        nativeButton={false}
        render={<Link href="/" />}
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Button>
      <Button nativeButton={false} render={<Link href="/upload" />}>
        <Upload className="size-4" aria-hidden="true" />
        Upload delivery receipt
      </Button>
    </div>
  );
}
