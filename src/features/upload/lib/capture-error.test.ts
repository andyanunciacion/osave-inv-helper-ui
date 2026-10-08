import { describe, expect, it } from "vitest";
import { OcrError } from "./api";
import { checkPhotoFile, MAX_PHOTO_BYTES, toCaptureError } from "./capture-error";

const fileOf = (name: string, type: string, size = 1) =>
  new File([new Uint8Array(size)], name, { type });

describe("checkPhotoFile", () => {
  it("accepts an ordinary photo", () => {
    expect(checkPhotoFile(fileOf("receipt.jpg", "image/jpeg"))).toBeNull();
  });

  it("accepts a .jfif the browser didn't label as an image", () => {
    expect(checkPhotoFile(fileOf("receipt.jfif", "application/octet-stream"))).toBeNull();
  });

  it("rejects a file that isn't an image, without offering a retry", () => {
    expect(checkPhotoFile(fileOf("notes.txt", "text/plain"))).toMatchObject({
      kind: "invalid_file",
      retryable: false,
    });
  });

  it("rejects a photo over 10MB, without offering a retry", () => {
    expect(checkPhotoFile(fileOf("big.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))).toMatchObject({
      kind: "too_large",
      retryable: false,
    });
  });

  it("accepts a photo of exactly 10MB", () => {
    expect(checkPhotoFile(fileOf("edge.jpg", "image/jpeg", MAX_PHOTO_BYTES))).toBeNull();
  });
});

describe("toCaptureError", () => {
  it.each([
    ["invalid_file_type", "invalid_file", false],
    ["file_too_large", "too_large", false],
    ["rate_limited", "limit", true],
    ["daily_limit_reached", "limit", false],
    ["ocr_failed", "failed", true],
    ["something_new", "failed", true],
  ])("maps the backend's %s to %s (retryable: %s)", (code, kind, retryable) => {
    expect(toCaptureError(new OcrError(code, "backend text"))).toMatchObject({ kind, retryable });
  });

  it("keeps the backend's store-mismatch message (it names both stores) and doesn't retry it", () => {
    const err = toCaptureError(
      new OcrError("store_mismatch", "This receipt is addressed to store 301, not store 245", "301"),
    );
    expect(err).toMatchObject({
      kind: "store_mismatch",
      message: "This receipt is addressed to store 301, not store 245",
      retryable: false,
    });
  });

  it("doesn't show staff the raw OCR error text", () => {
    const err = toCaptureError(new OcrError("ocr_failed", "13 INTERNAL: Vision API deadline exceeded"));
    expect(err.message).not.toContain("Vision");
  });

  it("calls a request that never got an answer a connection problem", () => {
    expect(toCaptureError(new TypeError("Failed to fetch"))).toMatchObject({
      kind: "network",
      retryable: true,
    });
  });

  it("treats any other thrown value as an unreadable receipt", () => {
    expect(toCaptureError(new SyntaxError("Unexpected token <"))).toMatchObject({ kind: "failed" });
  });
});
