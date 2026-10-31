import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivacyNotice } from "@/features/privacy/components/privacy-notice";

export const metadata: Metadata = {
  title: "Privacy notice · Inventory Helper",
};

// Not behind RequireStoreSession: the notice has to be readable before
// signing in.
export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background px-4 py-8 font-sans">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-lg"
            className="md:size-8"
            aria-label="Back"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <main className="flex flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <PrivacyNotice />
        </main>
      </div>
    </div>
  );
}
