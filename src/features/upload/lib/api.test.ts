import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PHOTO_BYTES, OcrError, runOcr } from "./api";

const { compressImage } = vi.hoisted(() => ({ compressImage: vi.fn() }));
vi.mock("./compress-image", () => ({ compressImage }));

const fileOfSize = (bytes: number) => new File([new Uint8Array(bytes)], "receipt.jpg", { type: "image/jpeg" });

const fetchMock = vi.fn();

beforeEach(() => {
  compressImage.mockReset();
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ header: {}, items: [], totals: {} }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runOcr", () => {
  it("sends a photo over 10MB once compression brings it under", async () => {
    const shrunk = fileOfSize(3 * 1024 * 1024);
    compressImage.mockResolvedValue(shrunk);

    await runOcr(fileOfSize(MAX_PHOTO_BYTES + 1), "245");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("image")).toBe(shrunk);
  });

  it("refuses a photo still over 10MB after compression, without sending it", async () => {
    compressImage.mockImplementation(async (file: File) => file);

    const result = runOcr(fileOfSize(MAX_PHOTO_BYTES + 1), "245");

    await expect(result).rejects.toBeInstanceOf(OcrError);
    await expect(result).rejects.toMatchObject({ code: "file_too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
