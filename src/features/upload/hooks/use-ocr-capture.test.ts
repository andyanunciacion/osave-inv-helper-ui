import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OcrError } from "../lib/api";
import { useOcrCapture } from "./use-ocr-capture";

const { runOcr, runOcrReconcile } = vi.hoisted(() => ({
  runOcr: vi.fn(),
  runOcrReconcile: vi.fn(),
}));
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  runOcr,
  runOcrReconcile,
}));

const file = (name = "receipt.jpg") => new File(["x"], name, { type: "image/jpeg" });

function ocrApiResponse(overrides: Partial<{ receipt_store_code: string; printout_datetime: string }> = {}) {
  return {
    header: {
      delivery_code: "ITPH1",
      warehouse_code: "BUN DC",
      delivery_date: "2026-08-17",
      receipt_store_code: "245",
      printout_datetime: "2026-08-17T11:15:30",
      ...overrides,
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
  };
}

describe("useOcrCapture", () => {
  beforeEach(() => {
    runOcr.mockReset();
    runOcrReconcile.mockReset();
  });

  it("sends the session's store code with the photo and gives each row a localId", async () => {
    runOcr.mockResolvedValue(ocrApiResponse());

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));
    expect(result.current.status).toBe("processing");

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(runOcr).toHaveBeenCalledWith(expect.any(File), "245");
    expect(result.current.currentPage?.ocrResult.items[0].localId).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it("skips reconcile for a single-photo capture", async () => {
    runOcr.mockResolvedValue(ocrApiResponse());

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(runOcrReconcile).not.toHaveBeenCalled();
    expect(result.current.pages).toHaveLength(1);
    expect(result.current.isLastPage).toBe(true);
  });

  it("reports a store mismatch as its own error kind, with the backend's message", async () => {
    runOcr.mockRejectedValue(
      new OcrError("store_mismatch", "This receipt is addressed to store 245, not store 999", "245"),
    );

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "999"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatchObject({
      kind: "store_mismatch",
      message: "This receipt is addressed to store 245, not store 999",
    });
    expect(result.current.currentPage).toBeNull();
  });

  it("reports the backend's rate limits as a limit error", async () => {
    runOcr.mockRejectedValue(new OcrError("rate_limited", "Too many OCR requests, try again in a minute"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.error?.kind).toBe("limit"));
  });

  it("falls back to a generic error for anything else (network, 502, unreadable photo)", async () => {
    runOcr.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.error?.kind).toBe("failed"));
  });

  it("clears the error and result on reset", async () => {
    runOcr.mockRejectedValue(new OcrError("store_mismatch", "wrong store", "1"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.pages).toHaveLength(0);
  });

  it("runs OCR on every file in a batch, then reconciles their headers once", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse({ receipt_store_code: "245" }))
      .mockResolvedValueOnce(ocrApiResponse({ receipt_store_code: "" }));
    runOcrReconcile.mockResolvedValue([
      { ...ocrApiResponse({ receipt_store_code: "245" }).header, receipt_store_code_inferred: false, store_mismatch: false },
      { ...ocrApiResponse({ receipt_store_code: "245" }).header, receipt_store_code_inferred: true, store_mismatch: false },
    ]);

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("a.jpg"), file("b.jpg")], "245"));

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(runOcrReconcile).toHaveBeenCalledTimes(1);
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.pages[0].receiptStoreCodeInferred).toBe(false);
    expect(result.current.pages[1].receiptStoreCodeInferred).toBe(true);
    expect(result.current.pages[1].ocrResult.header.receipt_store_code).toBe("245");
  });

  it("names the failed file when one of several fails, and never calls reconcile", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.fileName).toBe("bad.jpg");
    expect(runOcrReconcile).not.toHaveBeenCalled();
    expect(result.current.pages).toHaveLength(0);
  });

  it("advances to the next page and reports isLastPage correctly", async () => {
    runOcr.mockResolvedValueOnce(ocrApiResponse()).mockResolvedValueOnce(ocrApiResponse());
    runOcrReconcile.mockResolvedValue([
      { ...ocrApiResponse().header, receipt_store_code_inferred: false, store_mismatch: false },
      { ...ocrApiResponse().header, receipt_store_code_inferred: false, store_mismatch: false },
    ]);

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("a.jpg"), file("b.jpg")], "245"));
    await waitFor(() => expect(result.current.status).toBe("done"));

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isLastPage).toBe(false);

    act(() => result.current.advance());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isLastPage).toBe(true);
  });
});
