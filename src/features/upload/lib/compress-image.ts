// Shrinks a receipt photo before it's sent to /api/ocr, but only when it has
// to: the backend refuses images over 10MB (its multer limit). The backend
// runs as one always-on server, not serverless functions, so that's the only
// limit — a serverless host would cap the whole request near 4.5MB and need a
// much lower target.
//
// Compression is a last resort because it changes what OCR reads. Tested on
// real receipts, downscaling flipped cells under the diagonal date watermark
// between read and blank (Unit/Box, Qty, price) — even at 2400px, and not
// consistently better or worse with size. Re-encoding at full resolution
// with quality 0.85 read the same as the original. So photos under the
// target are sent untouched, and larger ones step down from full resolution
// until one fits.
//
// Any failure (a format the browser can't decode, no canvas support) sends
// the original instead — compression is an optimisation, never a reason for
// an upload to fail.

export interface CompressStep {
  // Longest side of the output, in pixels. Smaller photos aren't upscaled.
  maxEdge: number;
  // JPEG quality, 0-1.
  quality: number;
}

export interface CompressOptions {
  // Files at or under this size are sent as-is.
  targetBytes: number;
  // Tried in order; the first result at or under `targetBytes` is used. If
  // none fits, the last (smallest) result is used.
  steps: CompressStep[];
}

export const DEFAULT_COMPRESS_OPTIONS: CompressOptions = {
  // Under the backend's 10MB limit, with room to spare — high enough that
  // the photos that work today are sent untouched.
  targetBytes: 9 * 1024 * 1024,
  steps: [
    { maxEdge: Number.POSITIVE_INFINITY, quality: 0.85 },
    { maxEdge: 3200, quality: 0.85 },
    { maxEdge: 2400, quality: 0.85 },
  ],
};

function jpegName(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot === -1 ? name : name.slice(0, dot)}.jpg`;
}

async function encodeJpeg(bitmap: ImageBitmap, step: CompressStep): Promise<Blob | null> {
  const scale = Math.min(1, step.maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG has no alpha: a transparent PNG would otherwise turn black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", step.quality));
}

export async function compressImage(file: File, options: CompressOptions = DEFAULT_COMPRESS_OPTIONS): Promise<File> {
  if (file.size <= options.targetBytes) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF rotation phones write instead of
    // rotating the pixels, so the receipt isn't sent sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    let smallest: Blob | null = null;
    for (const step of options.steps) {
      const blob = await encodeJpeg(bitmap, step);
      if (!blob) return file;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= options.targetBytes) break;
    }
    if (!smallest || smallest.size >= file.size) return file;
    return new File([smallest], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
