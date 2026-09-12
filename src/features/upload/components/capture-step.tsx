"use client";

import { useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaptureStatus } from "../hooks/use-ocr-capture";

interface CaptureStepProps {
  status: CaptureStatus;
  onFileSelected: (file: File) => void;
}

// Thin: the file-input ref/click is a DOM-only concern, not business logic.
// §2: <input capture="environment"> is the recommended cross-browser way to
// get a photo (camera or gallery) without a custom getUserMedia UI.
export function CaptureStep({ status, onFileSelected }: CaptureStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (status === "processing") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Reading receipt…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <Camera className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-card-foreground">
          Take or upload a photo of the delivery receipt
        </p>
        <p className="text-xs text-muted-foreground">
          The header and item table will be read automatically.
        </p>
      </div>
      {status === "error" ? (
        <p className="text-xs text-destructive">
          Couldn&apos;t read that receipt. Try again.
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFileSelected(file);
        }}
      />
      <Button type="button" size="lg" onClick={() => inputRef.current?.click()}>
        <Camera className="size-4" aria-hidden="true" />
        Capture receipt
      </Button>
    </div>
  );
}
