"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreSession } from "../hooks/use-store-session";

// Thin: only local input state + JSX. Session logic lives in useStoreSession.
export function StoreCodeForm() {
  const { storeCode, setStoreCode, clearStoreCode } = useStoreSession();
  const [draft, setDraft] = useState("");
  const router = useRouter();

  if (storeCode) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Store:{" "}
          <span className="font-medium text-card-foreground">{storeCode}</span>
        </span>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
          onClick={clearStoreCode}
        >
          Change store
        </Button>
      </div>
    );
  }

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
      <Button type="button" variant="outline" className="w-full">
        <QrCode className="size-4" aria-hidden="true" />
        Scan store QR code
      </Button>
    </div>
  );
}
