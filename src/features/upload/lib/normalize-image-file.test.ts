import { describe, expect, it } from "vitest";
import { normalizeImageFile } from "./normalize-image-file";

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("normalizeImageFile", () => {
  it("relabels a .jfif reported as octet-stream to image/jpeg", () => {
    const result = normalizeImageFile(file("11.jfif", "application/octet-stream"));
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("11.jfif");
  });

  it("relabels a JPEG-family extension with no type, case-insensitively", () => {
    expect(normalizeImageFile(file("RECEIPT.JFIF", "")).type).toBe("image/jpeg");
    expect(normalizeImageFile(file("receipt.jpg", "")).type).toBe("image/jpeg");
  });

  it("leaves a file that already has an image type untouched", () => {
    const original = file("receipt.png", "image/png");
    expect(normalizeImageFile(original)).toBe(original);
  });

  it("leaves a non-JPEG unknown file untouched so the backend still rejects it", () => {
    const original = file("notes.pdf", "application/pdf");
    expect(normalizeImageFile(original)).toBe(original);
  });
});
