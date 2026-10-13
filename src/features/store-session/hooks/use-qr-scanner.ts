import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

// §10 phase 3, AI_DOCS/main-file.md: QR scanning for store code. §2 of that
// doc calls for the native BarcodeDetector API as primary, with
// @zxing/browser as a polyfill fallback for browsers that lack it (notably
// iOS Safari). The native detector is meaningfully more reliable at reading
// real-world QR images (skew, glare, small quiet zone) than zxing-js's
// canvas/binarizer approach, so it's tried first wherever available.
export type QrScannerStatus =
  | "idle"
  | "requesting-camera"
  | "scanning"
  | "camera-error"
  | "decoding-image"
  | "image-error";

export interface UseQrScannerOptions {
  onDecode: (value: string) => void;
}

export interface UseQrScannerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: QrScannerStatus;
  errorMessage: string | null;
  startCamera: () => void;
  stopCamera: () => void;
  decodeImageFile: (file: File) => void;
}

const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError:
    "Camera access was denied. Allow camera access, or upload a QR code image instead.",
  NotFoundError:
    "No camera was found on this device. Upload a QR code image instead.",
};

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : undefined;
  return (
    (name && CAMERA_ERROR_MESSAGES[name]) ||
    "Couldn't access the camera. Upload a QR code image instead."
  );
}

function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

async function detectFromImageNatively(file: File): Promise<string | null> {
  if (!hasBarcodeDetector()) return null;
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const barcodes = await detector.detect(file);
  return barcodes[0]?.rawValue ?? null;
}

async function decodeImageWithZxing(
  reader: BrowserQRCodeReader,
  file: File,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const result = await reader.decodeFromImageUrl(url);
    return result.getText();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useQrScanner({
  onDecode,
}: UseQrScannerOptions): UseQrScannerResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimeoutRef = useRef<number | null>(null);
  const [status, setStatus] = useState<QrScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (readerRef.current === null) {
    readerRef.current = new BrowserQRCodeReader();
  }

  const stopStream = useCallback(() => {
    if (detectTimeoutRef.current !== null) {
      window.clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const stopCamera = useCallback(() => {
    stopStream();
    setStatus("idle");
  }, [stopStream]);

  const startWithNativeDetector = useCallback(
    async (video: HTMLVideoElement) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      setStatus("scanning");

      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const barcodes = await detector.detect(video);
          const value = barcodes[0]?.rawValue;
          if (value) {
            stopStream();
            onDecode(value);
            return;
          }
        } catch {
          // Transient decode errors between frames are normal; keep trying.
        }
        detectTimeoutRef.current = window.setTimeout(tick, 200);
      };
      detectTimeoutRef.current = window.setTimeout(tick, 0);
    },
    [onDecode, stopStream],
  );

  const startWithZxing = useCallback(
    (video: HTMLVideoElement) => {
      const reader = readerRef.current;
      if (!reader) return;

      reader
        .decodeFromVideoDevice(undefined, video, (result, _error, controls) => {
          if (!result) return;
          controls.stop();
          controlsRef.current = null;
          onDecode(result.getText());
        })
        .then((controls) => {
          controlsRef.current = controls;
          setStatus("scanning");
        })
        .catch((error: unknown) => {
          setStatus("camera-error");
          setErrorMessage(cameraErrorMessage(error));
        });
    },
    [onDecode],
  );

  const startCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    setStatus("requesting-camera");

    if (hasBarcodeDetector()) {
      startWithNativeDetector(video).catch((error: unknown) => {
        setStatus("camera-error");
        setErrorMessage(cameraErrorMessage(error));
      });
    } else {
      startWithZxing(video);
    }
  }, [startWithNativeDetector, startWithZxing]);

  const decodeImageFile = useCallback(
    (file: File) => {
      const reader = readerRef.current;
      if (!reader) return;

      setErrorMessage(null);
      setStatus("decoding-image");

      detectFromImageNatively(file)
        .catch(() => null)
        .then((nativeValue) =>
          nativeValue ? nativeValue : decodeImageWithZxing(reader, file),
        )
        .then((value) => {
          setStatus("idle");
          onDecode(value);
        })
        .catch(() => {
          setStatus("image-error");
          setErrorMessage(
            "No QR code was found in that image. Try another photo.",
          );
        });
    },
    [onDecode],
  );

  return {
    videoRef,
    status,
    errorMessage,
    startCamera,
    stopCamera,
    decodeImageFile,
  };
}
