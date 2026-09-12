"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreSession } from "../hooks/use-store-session";

// Thin: only local input state + JSX. Session logic lives in useStoreSession.
export function StoreCodeForm() {
  const { storeCode, setStoreCode } = useStoreSession();
  const [draft, setDraft] = useState("");
  const router = useRouter();

  // Seed the draft from the stored code once it resolves (useStoreSession
  // reports null on the server/first client render, then the real value
  // after hydration). Guarded so it never clobbers an in-progress edit.
  useEffect(() => {
    if (storeCode) setDraft((prev) => prev || storeCode);
  }, [storeCode]);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          setStoreCode(draft);
          router.push("/search");
        }}
      >
        <div className="flex flex-col gap-1.5 sm:flex-1">
          <Label htmlFor="store-code">Store code</Label>
          <Input
            id="store-code"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="e.g. S09590203FG223jd"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={!draft.trim()}
        >
          Continue
        </Button>
      </form>
      <div className="flex items-center gap-3" role="separator">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <hr className="flex-1 border-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => router.push("/store-session/scan")}
      >
        <QrCode className="size-4" aria-hidden="true" />
        Scan/Upload store QR code
      </Button>
    </div>
  );
}
