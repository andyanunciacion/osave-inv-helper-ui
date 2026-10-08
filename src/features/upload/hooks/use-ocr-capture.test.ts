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

  it("counts photos as each one comes back, in whatever order they finish", async () => {
    const resolvers: Array<() => void> = [];
    runOcr.mockImplementation(
      () => new Promise((resolve) => resolvers.push(() => resolve(ocrApiResponse()))),
    );
    runOcrReconcile.mockImplementation(async (_store: string, headers: unknown[]) =>
      headers.map((h) => ({ ...(h as object), receipt_store_code_inferred: false })),
    );

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("a.jpg"), file("b.jpg"), file("c.jpg")], "245"));
    expect(result.current.progress).toEqual({ done: 0, total: 3 });

    await act(async () => resolvers[2]());
    expect(result.current.progress).toEqual({ done: 1, total: 3 });

    await act(async () => {
      resolvers[0]();
      resolvers[1]();
    });
    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.progress).toBeNull();
  });

  it("passes through calculated cells, handwriting flags and the printed totals", async () => {
    const response = ocrApiResponse();
    runOcr.mockResolvedValue({
      ...response,
      items: [{ ...response.items[0], quantity: "1", inferred: ["quantity"], has_annotation: true }],
      totals: { total_pcs: "", total_box: "8", total_items: "8", total_value: "9576.72" },
    });

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.status).toBe("done"));
    const ocr = result.current.currentPage!.ocrResult;
    expect(ocr.items[0]).toMatchObject({ inferred: ["quantity"], has_annotation: true });
    expect(ocr.totals.total_box).toBe("8");
  });

  it("defaults the new fields when talking to a backend that predates them", async () => {
    runOcr.mockResolvedValue(ocrApiResponse());

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.status).toBe("done"));
    const ocr = result.current.currentPage!.ocrResult;
    expect(ocr.items[0]).toMatchObject({ inferred: [], has_annotation: false });
    expect(ocr.totals).toEqual({ total_pcs: "", total_box: "", total_items: "", total_value: "" });
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

  it("reports a request that never got an answer as a connection problem", async () => {
    runOcr.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file()], "245"));

    await waitFor(() => expect(result.current.error?.kind).toBe("network"));
  });

  it("fails a file that isn't an image without sending it", async () => {
    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([new File(["x"], "notes.txt", { type: "text/plain" })], "245"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatchObject({ kind: "invalid_file", fileName: "notes.txt" });
    expect(runOcr).not.toHaveBeenCalled();
  });

  it("sends the rest of a batch when one file is rejected up front, and never retries that file", async () => {
    runOcr.mockResolvedValue(ocrApiResponse());

    const { result } = renderHook(() => useOcrCapture());
    act(() =>
      result.current.captureFiles(
        [file("good.jpg"), new File(["x"], "notes.txt", { type: "text/plain" })],
        "245",
      ),
    );

    await waitFor(() => expect(result.current.status).toBe("partial"));
    expect(runOcr).toHaveBeenCalledTimes(1);
    expect(result.current.failedPhotos).toEqual([
      { fileName: "notes.txt", error: expect.objectContaining({ kind: "invalid_file" }), retryable: false },
    ]);

    act(() => result.current.retryFailed());
    expect(runOcr).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["invalid_file_type", "Uploaded file must be an image"],
    ["file_too_large", "Image must be 10MB or smaller"],
    ["daily_limit_reached", "Daily OCR limit reached"],
  ])("doesn't offer to retry a photo the backend rejected with %s", async (code, message) => {
    runOcr.mockResolvedValueOnce(ocrApiResponse()).mockRejectedValueOnce(new OcrError(code, message));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));

    await waitFor(() => expect(result.current.status).toBe("partial"));
    expect(result.current.failedPhotos[0].retryable).toBe(false);
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

  it("pauses on `partial` when some photos fail, keeping the ones that were read", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));

    await waitFor(() => expect(result.current.status).toBe("partial"));
    expect(result.current.batchSize).toBe(2);
    expect(result.current.readCount).toBe(1);
    expect(result.current.failedPhotos).toEqual([
      { fileName: "bad.jpg", error: expect.objectContaining({ kind: "failed" }), retryable: true },
    ]);
    expect(runOcrReconcile).not.toHaveBeenCalled();
    expect(result.current.pages).toHaveLength(0);
  });

  it("retries only the failed photos, then reconciles the whole batch in pick order", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));
    runOcrReconcile.mockResolvedValue([
      { ...ocrApiResponse().header, receipt_store_code_inferred: false, store_mismatch: false },
      { ...ocrApiResponse().header, receipt_store_code_inferred: false, store_mismatch: false },
    ]);

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));
    await waitFor(() => expect(result.current.status).toBe("partial"));

    runOcr.mockResolvedValueOnce(ocrApiResponse({ printout_datetime: "2026-08-17T11:15:31" }));
    act(() => result.current.retryFailed());

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(runOcr).toHaveBeenCalledTimes(3);
    expect((runOcr.mock.calls[2][0] as File).name).toBe("bad.jpg");
    const sentHeaders = runOcrReconcile.mock.calls[0][1];
    expect(sentHeaders.map((h: { printout_datetime: string }) => h.printout_datetime)).toEqual([
      "2026-08-17T11:15:30",
      "2026-08-17T11:15:31",
    ]);
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.failedPhotos).toEqual([]);
  });

  it("continues with just the photos that were read", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));
    await waitFor(() => expect(result.current.status).toBe("partial"));

    act(() => result.current.continueWithRead());

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.pages).toHaveLength(1);
    // A single remaining page has nothing to reconcile against.
    expect(runOcrReconcile).not.toHaveBeenCalled();
  });

  it("doesn't retry a wrong-store photo — it would read the same again", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("store_mismatch", "This receipt is addressed to store 301, not store 245", "301"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("other-store.jpg")], "245"));
    await waitFor(() => expect(result.current.status).toBe("partial"));

    expect(result.current.failedPhotos[0]).toMatchObject({ fileName: "other-store.jpg", retryable: false });
    act(() => result.current.retryFailed());
    expect(runOcr).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("partial");
  });

  it("is an error naming the first failed file when no photo in the batch was read", async () => {
    runOcr
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"))
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("a.jpg"), file("b.jpg")], "245"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.fileName).toBe("a.jpg");
    expect(runOcrReconcile).not.toHaveBeenCalled();
  });

  it("forgets the failed photos on reset", async () => {
    runOcr
      .mockResolvedValueOnce(ocrApiResponse())
      .mockRejectedValueOnce(new OcrError("ocr_failed", "Couldn't read that receipt"));

    const { result } = renderHook(() => useOcrCapture());
    act(() => result.current.captureFiles([file("good.jpg"), file("bad.jpg")], "245"));
    await waitFor(() => expect(result.current.status).toBe("partial"));

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.failedPhotos).toEqual([]);
    expect(result.current.batchSize).toBe(0);
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
