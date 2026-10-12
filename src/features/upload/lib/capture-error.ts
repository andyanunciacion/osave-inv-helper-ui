// What the capture screen says when a photo can't be turned into a page, and
// whether retrying it could help. Each cause gets its own advice — "try
// again" is wrong for a file that isn't an image or is too big, and lumping
// those in with unreadable photos is what made the #28 JFIF bug look like a
// blurry receipt.
import { OcrError } from "./api";
import { normalizeImageFile } from "./normalize-image-file";

// `store_mismatch`: the receipt is addressed to another store. `limit`: the
// backend's OCR rate/daily cap was hit. `invalid_file` / `too_large`: the file
// itself can't be sent. `network`: the request never got an answer.
// `failed`: anything else (unreadable photo, server error).
export type CaptureErrorKind =
  | "store_mismatch"
  | "limit"
  | "invalid_file"
  | "too_large"
  | "network"
  | "failed";

export interface CaptureError {
  kind: CaptureErrorKind;
  title: string;
  message: string;
  // False when sending the same photo again would fail the same way.
  retryable: boolean;
  // Which file in a multi-select batch this came from, so the capture
  // screen can name it rather than leaving the user guessing which of
  // several selected photos failed.
  fileName?: string;
}

const INVALID_FILE: CaptureError = {
  kind: "invalid_file",
  title: "Not a photo",
  message: "This file isn't an image. Pick a photo of the receipt instead.",
  retryable: false,
};

const TOO_LARGE: CaptureError = {
  kind: "too_large",
  title: "Photo too large",
  message: "This photo is still over 10MB after shrinking it. Retake it or pick a smaller copy.",
  retryable: false,
};

const NETWORK: CaptureError = {
  kind: "network",
  title: "No connection",
  message: "Couldn't reach the server. Check your connection and try again.",
  retryable: true,
};

const UNREADABLE: CaptureError = {
  kind: "failed",
  title: "Couldn't read that receipt",
  message: "Couldn't read the receipt from this photo. Try a clearer, flatter shot with the whole receipt in frame.",
  retryable: true,
};

const RATE_LIMITED: CaptureError = {
  kind: "limit",
  title: "Too many receipts at once",
  message: "Too many receipts were read in the last minute. Wait a minute, then try again.",
  retryable: true,
};

const DAILY_LIMIT: CaptureError = {
  kind: "limit",
  title: "Daily limit reached",
  message: "Today's receipt-reading limit has been reached. Try again tomorrow.",
  retryable: false,
};

// Catches a file /api/ocr would reject as not an image before sending it, so
// it never makes the request or counts against the OCR rate limit. Same test
// the backend applies: the part's content type must be image/* once JFIF is
// relabelled. Size isn't checked here — a large photo is compressed first,
// and runOcr refuses it only if it's still too big.
export function checkPhotoFile(file: File): CaptureError | null {
  if (!normalizeImageFile(file).type.startsWith("image/")) return INVALID_FILE;
  return null;
}

export function toCaptureError(err: unknown): CaptureError {
  // fetch() rejects with a TypeError when the request never got an answer.
  if (err instanceof TypeError) return NETWORK;
  if (!(err instanceof OcrError)) return UNREADABLE;

  switch (err.code) {
    case "store_mismatch":
      return { kind: "store_mismatch", title: "Wrong store", message: err.message, retryable: false };
    case "rate_limited":
      return RATE_LIMITED;
    case "daily_limit_reached":
      return DAILY_LIMIT;
    case "invalid_file_type":
      return INVALID_FILE;
    case "file_too_large":
      return TOO_LARGE;
    // ocr_failed carries the raw Vision API error text — not for staff.
    default:
      return UNREADABLE;
  }
}
