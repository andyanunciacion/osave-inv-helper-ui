"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreSession } from "../hooks/use-store-session";
import { useStoreSignIn } from "../hooks/use-store-sign-in";

// Thin: only local input state + JSX. Session state lives in useStoreSession,
// the passcode check in useStoreSignIn.
export function StoreCodeForm() {
  const { storeCode, hasPasscode } = useStoreSession();
  const { signIn, canReusePasscode, isPending, errorMessage } = useStoreSignIn();
  const [draft, setDraft] = useState("");
  const [passcode, setPasscode] = useState("");
  const [seededStoreCode, setSeededStoreCode] = useState<string | null>(null);
  const router = useRouter();

  // Seed the draft from the stored code once it resolves (useStoreSession
  // reports null on the server/first client render, then the real value
  // after hydration). Adjusted during render rather than in an effect, per
  // React's guidance for resetting state in response to a prop change —
  // avoids the extra commit-then-effect-then-re-render round trip. Guarded
  // so it never clobbers an in-progress edit.
  if (storeCode && storeCode !== seededStoreCode) {
    setSeededStoreCode(storeCode);
    if (!draft) setDraft(storeCode);
  }

  const reusePasscode = canReusePasscode(draft);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await signIn(draft, passcode)) router.push("/search");
        }}
      >
        {/* A scanned QR code, or a passcode the backend stopped accepting,
            leaves a store code without its passcode. */}
        {storeCode && !hasPasscode ? (
          <p className="text-sm text-muted-foreground">Enter the passcode for store {storeCode}.</p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="store-code">Store code</Label>
          <Input
            id="store-code"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="e.g. S09590203FG223jd"
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="store-passcode">Passcode</Label>
          <Input
            id="store-passcode"
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder={reusePasscode ? "Saved on this phone" : "Store passcode"}
            autoComplete="current-password"
            aria-invalid={Boolean(errorMessage)}
          />
        </div>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={!draft.trim() || (!passcode && !reusePasscode) || isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Continue"}
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
