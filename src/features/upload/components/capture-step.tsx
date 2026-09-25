"use client";

import { useRef } from "react";
import { AlertTriangle, Camera, ImagePlus, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CaptureError, CaptureStatus } from "../hooks/use-ocr-capture";

interface CaptureStepProps {
  status: CaptureStatus;
  error: CaptureError | null;
  onFilesSelected: (files: File[]) => void;
}

// Thin: the file-input ref/click is a DOM-only concern, not business logic.
// §2: <input capture="environment"> is the recommended cross-browser way to
// get a single photo (camera or gallery) without a custom getUserMedia UI —
// it doesn't support multi-select on mobile, so a second, camera-less input
// (`multiple`) covers picking several already-taken photos at once for a
// multi-page/multi-receipt batch upload.
export function CaptureStep({ status, error, onFilesSelected }: CaptureStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
          Take or upload photos of the delivery receipt
        </p>
        <p className="text-xs text-muted-foreground">
          The header and item table will be read automatically. Uploading several pages at once
          also helps recover a store code hidden by a fold or staple on one of them.
        </p>
      </div>
      {status === "error" && error ? (
        <Alert variant="destructive" className="text-left">
          <AlertTriangle />
          <AlertTitle>
            {error.kind === "store_mismatch" ? "Wrong store" : "Couldn't read that receipt"}
          </AlertTitle>
          <AlertDescription>
            {error.fileName ? `${error.fileName}: ` : ""}
            {error.kind === "store_mismatch"
              ? `${error.message}. Check you're signed in to the right store, or pick the right receipt.`
              : error.message}
          </AlertDescription>
        </Alert>
      ) : null}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFilesSelected([file]);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFilesSelected(files);
        }}
      />
      <div className="flex gap-2">
        <Button type="button" size="lg" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="size-4" aria-hidden="true" />
          Capture receipt
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={() => galleryInputRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden="true" />
          Choose photos
        </Button>
      </div>
    </div>
  );
}
