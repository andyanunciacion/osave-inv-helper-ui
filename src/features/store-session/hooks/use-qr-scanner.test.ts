import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQrScanner } from "./use-qr-scanner";

type DecodeContinuouslyCallback = (
  result: { getText(): string } | undefined,
  error: unknown,
  controls: { stop: () => void },
) => void;

const decodeFromVideoDeviceMock = vi.fn();
const decodeFromImageUrlMock = vi.fn();

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    decodeFromVideoDevice = decodeFromVideoDeviceMock;
    decodeFromImageUrl = decodeFromImageUrlMock;
  },
}));

// jsdom doesn't implement the createObjectURL/revokeObjectURL pair used to
// decode an uploaded image file.
URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

describe("useQrScanner", () => {
  beforeEach(() => {
    decodeFromVideoDeviceMock.mockReset();
    decodeFromImageUrlMock.mockReset();
  });

  it("starts scanning and reports a decoded value from the video callback", async () => {
    const stop = vi.fn();
    let callback: DecodeContinuouslyCallback | undefined;
    decodeFromVideoDeviceMock.mockImplementation((_deviceId, _video, cb) => {
      callback = cb;
      return Promise.resolve({ stop });
    });
    const onDecode = vi.fn();
    const { result } = renderHook(() => useQrScanner({ onDecode }));

    // Attach a fake video element, since the hook requires videoRef.current.
    result.current.videoRef.current = document.createElement("video");

    act(() => result.current.startCamera());

    await waitFor(() => expect(result.current.status).toBe("scanning"));

    act(() => {
      callback?.(
        { getText: () => "ST01" } as unknown as Parameters<DecodeContinuouslyCallback>[0],
        undefined,
        { stop },
      );
    });

    expect(onDecode).toHaveBeenCalledWith("ST01");
    expect(stop).toHaveBeenCalled();
  });

  it("surfaces a friendly message when camera permission is denied", async () => {
    const permissionError = Object.assign(new Error("denied"), {
      name: "NotAllowedError",
    });
    decodeFromVideoDeviceMock.mockRejectedValue(permissionError);
    const { result } = renderHook(() => useQrScanner({ onDecode: vi.fn() }));

    result.current.videoRef.current = document.createElement("video");

    act(() => result.current.startCamera());

    await waitFor(() => expect(result.current.status).toBe("camera-error"));
    expect(result.current.errorMessage).toMatch(/denied/i);
  });

  it("decodes a QR code from an uploaded image", async () => {
    decodeFromImageUrlMock.mockResolvedValue({ getText: () => "ST02" });
    const onDecode = vi.fn();
    const { result } = renderHook(() => useQrScanner({ onDecode }));
    const file = new File(["fake"], "qr.png", { type: "image/png" });

    act(() => result.current.decodeImageFile(file));

    await waitFor(() => expect(onDecode).toHaveBeenCalledWith("ST02"));
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("reports an error when the uploaded image has no QR code", async () => {
    decodeFromImageUrlMock.mockRejectedValue(new Error("not found"));
    const { result } = renderHook(() => useQrScanner({ onDecode: vi.fn() }));
    const file = new File(["fake"], "not-a-qr.png", { type: "image/png" });

    act(() => result.current.decodeImageFile(file));

    await waitFor(() => expect(result.current.status).toBe("image-error"));
    expect(result.current.errorMessage).toMatch(/no qr code/i);
  });

  describe("when the native BarcodeDetector API is available", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("decodes an uploaded image natively without falling back to zxing", async () => {
      const detect = vi.fn().mockResolvedValue([{ rawValue: "ST03" }]);
      vi.stubGlobal(
        "BarcodeDetector",
        class {
          detect = detect;
        },
      );
      const onDecode = vi.fn();
      const { result } = renderHook(() => useQrScanner({ onDecode }));
      const file = new File(["fake"], "qr.png", { type: "image/png" });

      act(() => result.current.decodeImageFile(file));

      await waitFor(() => expect(onDecode).toHaveBeenCalledWith("ST03"));
      expect(decodeFromImageUrlMock).not.toHaveBeenCalled();
    });

    it("falls back to zxing when the native detector finds nothing", async () => {
      const detect = vi.fn().mockResolvedValue([]);
      vi.stubGlobal(
        "BarcodeDetector",
        class {
          detect = detect;
        },
      );
      decodeFromImageUrlMock.mockResolvedValue({ getText: () => "ST04" });
      const onDecode = vi.fn();
      const { result } = renderHook(() => useQrScanner({ onDecode }));
      const file = new File(["fake"], "qr.png", { type: "image/png" });

      act(() => result.current.decodeImageFile(file));

      await waitFor(() => expect(onDecode).toHaveBeenCalledWith("ST04"));
    });
  });
});
