import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OcrError } from "../lib/api";
import { useOcrCapture } from "./use-ocr-capture";

const { runOcr } = vi.hoisted(() => ({ runOcr: vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  runOcr,
}));

const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

describe("useOcrCapture", () => {
  beforeEach(() => {
    runOcr.mockReset();
  });

  it("sends the session's store code with the photo and gives each row a localId", async () => {
    runOcr.mockResolvedValue({
      header: {
        delivery_code: "ITPH1",
        warehouse_code: "BUN DC",
        delivery_date: "2026-08-17",
        receipt_store_code: "245",
      },
      items: [
        {
          item_code: "7667",
          item_name: "Baby Diaper Pants",
          unit_count: "12",
          quantity: "1",
          unit: "BOX",
          item_price: "52.31",
          total_item_price: "627.72",
        },
      ],
    });

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFile(file, "245"));
    expect(result.current.status).toBe("processing");

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(runOcr).toHaveBeenCalledWith(file, "245");
    expect(result.current.ocrResult?.items[0].localId).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it("reports a store mismatch as its own error kind, with the backend's message", async () => {
    runOcr.mockRejectedValue(
      new OcrError("store_mismatch", "This receipt is addressed to store 245, not store 999", "245"),
    );

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFile(file, "999"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toEqual({
      kind: "store_mismatch",
      message: "This receipt is addressed to store 245, not store 999",
    });
    expect(result.current.ocrResult).toBeNull();
  });

  it("reports the backend's rate limits as a limit error", async () => {
    runOcr.mockRejectedValue(new OcrError("rate_limited", "Too many OCR requests, try again in a minute"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFile(file, "245"));

    await waitFor(() => expect(result.current.error?.kind).toBe("limit"));
  });

  it("falls back to a generic error for anything else (network, 502, unreadable photo)", async () => {
    runOcr.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFile(file, "245"));

    await waitFor(() => expect(result.current.error?.kind).toBe("failed"));
  });

  it("clears the error and result on reset", async () => {
    runOcr.mockRejectedValue(new OcrError("store_mismatch", "wrong store", "1"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFile(file, "245"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
