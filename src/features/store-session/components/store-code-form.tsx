"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreSession } from "../hooks/use-store-session";

// Thin: only local input state + JSX. Session logic lives in useStoreSession.
export function StoreCodeForm() {
  const { storeCode, setStoreCode, clearStoreCode } = useStoreSession();
  const [draft, setDraft] = useState("");

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
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim()) setStoreCode(draft);
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
  );
}
