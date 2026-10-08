import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import { useUploadBatch, type BatchPosition } from "./use-upload-batch";

const saved: CreateDeliveryResult = {
  status: "success",
  delivery: null,
  acceptedItems: [],
  rejectedItems: [],
  mergedItems: [],
};

function setup(position: Partial<BatchPosition> = {}) {
  const props: BatchPosition = {
    pageCount: 3,
    currentIndex: 0,
    isLastPage: false,
    advance: vi.fn(),
    reset: vi.fn(),
    ...position,
  };
  const hook = renderHook((p: BatchPosition) => useUploadBatch(p), { initialProps: props });
  const moveTo = (currentIndex: number) =>
    hook.rerender({ ...props, currentIndex, isLastPage: currentIndex >= props.pageCount - 1 });
  return { ...hook, props, moveTo };
}

describe("useUploadBatch", () => {
  it("advances after a save mid-batch and finishes after the last page", () => {
    const { result, props, moveTo } = setup();

    act(() => result.current.recordSaved(saved));
    expect(props.advance).toHaveBeenCalledTimes(1);
    expect(result.current.finished).toBe(false);

    moveTo(2);
    act(() => result.current.recordSaved(saved));
    expect(result.current.finished).toBe(true);
    expect(result.current.savedPages.map((page) => page.index)).toEqual([0, 2]);
  });

  it("skips a page that saved nothing and moves on to the next one", () => {
    const { result, props } = setup();

    expect(result.current.skipLabel).toBe("Skip to next page");
    act(() => result.current.skip());

    expect(props.advance).toHaveBeenCalledTimes(1);
    expect(props.reset).not.toHaveBeenCalled();
    expect(result.current.skippedPages).toEqual([0]);
    expect(result.current.finished).toBe(false);
  });

  it("finishes when the last page is skipped, even with nothing saved", () => {
    const { result, moveTo } = setup();

    act(() => result.current.skip());
    moveTo(1);
    act(() => result.current.skip());
    moveTo(2);
    expect(result.current.skipLabel).toBe("Skip and finish");
    act(() => result.current.skip());

    expect(result.current.finished).toBe(true);
    expect(result.current.savedPages).toEqual([]);
    expect(result.current.skippedPages).toEqual([0, 1, 2]);
  });

  it("goes straight back to capture when a single photo is skipped", () => {
    const { result, props } = setup({ pageCount: 1, isLastPage: true });

    expect(result.current.skipLabel).toBe("Upload another");
    act(() => result.current.skip());

    expect(props.reset).toHaveBeenCalledTimes(1);
    expect(result.current.finished).toBe(false);
    expect(result.current.skippedPages).toEqual([]);
  });

  it("cancel reports saved pages, or starts over when nothing was saved", () => {
    const first = setup();
    act(() => first.result.current.skip());
    first.moveTo(1);
    act(() => first.result.current.cancel());
    expect(first.props.reset).toHaveBeenCalledTimes(1);
    expect(first.result.current.finished).toBe(false);
    expect(first.result.current.skippedPages).toEqual([]);

    const second = setup();
    act(() => second.result.current.recordSaved(saved));
    second.moveTo(1);
    act(() => second.result.current.cancel());
    expect(second.props.reset).not.toHaveBeenCalled();
    expect(second.result.current.finished).toBe(true);
  });
});
