"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQrScanner } from "../hooks/use-qr-scanner";
import { useQrSignIn } from "../hooks/use-qr-sign-in";

// Thin: local file-input ref only. Scan lifecycle + decode logic live in
// useQrScanner; reading the QR code and signing in live in useQrSignIn. A
// store's sign-in QR code goes straight on to search; one that still needs
// the passcode goes back to the store screen for it.
export function QrScanView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signInWithQr, signingInStoreCode, errorMessage: qrErrorMessage } = useQrSignIn();

  const { videoRef, status, errorMessage, startCamera, stopCamera, decodeImageFile } =
    useQrScanner({
      onDecode: async (raw) => {
        const outcome = await signInWithQr(raw);
        if (outcome === "signed-in") router.push("/search");
        else if (outcome === "needs-passcode") router.push("/");
      },
    });

  const isScanning = status === "scanning" || status === "requesting-camera";
  const isSigningIn = signingInStoreCode !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
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
        <h1 className="text-lg font-semibold">Scan store QR code</h1>
      </div>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
        <video
          ref={videoRef}
          className={cn(
            "h-full w-full object-cover",
            !isScanning && "hidden",
          )}
          muted
          playsInline
        />
        {!isScanning && (
          <div
            className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                <p>Signing in to store {signingInStoreCode}…</p>
              </>
            ) : status === "camera-error" ? (
              <p className="text-destructive">{errorMessage}</p>
            ) : status === "idle" && qrErrorMessage ? (
              <p className="text-destructive">{qrErrorMessage}</p>
            ) : (
              <p>Point your camera at the store&apos;s QR code.</p>
            )}
          </div>
        )}
        {status === "scanning" && (
          <div
            className="pointer-events-none absolute inset-8 rounded-lg border-2 border-primary"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {isScanning ? (
          <Button type="button" variant="outline" onClick={stopCamera}>
            Cancel
          </Button>
        ) : (
          <Button type="button" onClick={startCamera} disabled={isSigningIn}>
            <Camera className="size-4" aria-hidden="true" />
            {status === "idle" && qrErrorMessage ? "Scan again" : "Enable camera"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isSigningIn}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="size-4" aria-hidden="true" />
          Upload QR code image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) decodeImageFile(file);
          }}
        />
        {status === "image-error" && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
