"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStoreSession } from "../hooks/use-store-session";
import { useQrScanner } from "../hooks/use-qr-scanner";

// Thin: local file-input ref only. Scan lifecycle + decode logic live in
// useQrScanner; session persistence lives in useStoreSession.
export function QrScanView() {
  const router = useRouter();
  const { setStoreCode } = useStoreSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { videoRef, status, errorMessage, startCamera, stopCamera, decodeImageFile } =
    useQrScanner({
      onDecode: (code) => {
        setStoreCode(code);
        router.push("/search");
      },
    });

  const isScanning = status === "scanning" || status === "requesting-camera";

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
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {status === "camera-error" ? (
              <p className="text-destructive">{errorMessage}</p>
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
          <Button type="button" onClick={startCamera}>
            <Camera className="size-4" aria-hidden="true" />
            Enable camera
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
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
