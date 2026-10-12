import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compressImage, type CompressOptions } from "./compress-image";

const fileOfSize = (name: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });

// Small numbers stand in for MB so the test files stay tiny.
const options: CompressOptions = {
  targetBytes: 400,
  steps: [
    { maxEdge: Number.POSITIVE_INFINITY, quality: 0.85 },
    { maxEdge: 2000, quality: 0.85 },
    { maxEdge: 1000, quality: 0.85 },
  ],
};

// The fake encoder's output size per canvas width — what each step produces
// for the 4000x3000 bitmap below.
let blobBytesByWidth: Record<number, number>;
const encodedWidths: number[] = [];
const createImageBitmapMock = vi.fn();

beforeEach(() => {
  blobBytesByWidth = { 4000: 300, 2000: 200, 1000: 100 };
  encodedWidths.length = 0;
  createImageBitmapMock.mockReset().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() });
  vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback) {
    encodedWidths.push(this.width);
    callback(new Blob([new Uint8Array(blobBytesByWidth[this.width])], { type: "image/jpeg" }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("compressImage", () => {
  it("sends a photo at or under the target untouched, without decoding it", async () => {
    const original = fileOfSize("receipt.jpg", 400);
    expect(await compressImage(original, options)).toBe(original);
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it("stops at full resolution when re-encoding alone fits the target", async () => {
    const result = await compressImage(fileOfSize("receipt.jfif", 1000), options);
    expect(encodedWidths).toEqual([4000]);
    expect(result.size).toBe(300);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("receipt.jpg");
  });

  it("steps down in size until a result fits", async () => {
    blobBytesByWidth[4000] = 900;
    blobBytesByWidth[2000] = 350;
    const result = await compressImage(fileOfSize("receipt.jpg", 1000), options);
    expect(encodedWidths).toEqual([4000, 2000]);
    expect(result.size).toBe(350);
  });

  it("uses the smallest result when no step fits", async () => {
    blobBytesByWidth = { 4000: 900, 2000: 800, 1000: 700 };
    const result = await compressImage(fileOfSize("receipt.jpg", 1000), options);
    expect(encodedWidths).toEqual([4000, 2000, 1000]);
    expect(result.size).toBe(700);
  });

  it("keeps the original when re-encoding doesn't make it smaller", async () => {
    blobBytesByWidth = { 4000: 1200, 2000: 1100, 1000: 1000 };
    const original = fileOfSize("receipt.jpg", 1000);
    expect(await compressImage(original, options)).toBe(original);
  });

  it("keeps the original when the browser can't decode it", async () => {
    createImageBitmapMock.mockRejectedValue(new DOMException("unsupported", "InvalidStateError"));
    const original = fileOfSize("receipt.heic", 1000);
    expect(await compressImage(original, options)).toBe(original);
  });
});
