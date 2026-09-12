import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadFlow } from "@/features/upload/components/upload-flow";

export default function UploadPage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background px-4 py-8 font-sans">
      <main className="flex w-full max-w-md flex-col gap-6 rounded-lg bg-card p-6 text-card-foreground shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-lg"
            className="md:size-8"
            aria-label="Back to search"
            nativeButton={false}
            render={<Link href="/search" />}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <h1 className="text-lg font-semibold">Upload delivery receipt</h1>
        </div>
        <UploadFlow />
      </main>
    </div>
  );
}
