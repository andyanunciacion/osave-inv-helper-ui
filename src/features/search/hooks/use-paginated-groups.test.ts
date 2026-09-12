import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DeliveryGroup } from "@/features/deliveries/types";
import { usePaginatedGroups } from "./use-paginated-groups";

function makeGroups(count: number): DeliveryGroup[] {
  return Array.from({ length: count }, (_, index) => ({
    delivery: {
      delivery_code: `INV-${index}`,
      store_code: "STORE1",
      warehouse_code: null,
      delivery_date: "2026-01-01",
      receipt_store_code: null,
      uploaded_by: null,
      status: "confirmed" as const,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    items: [],
  }));
}

describe("usePaginatedGroups", () => {
  it("shows only the first page initially", () => {
    const groups = makeGroups(40);
    const { result } = renderHook(() => usePaginatedGroups(groups, 15));
    expect(result.current.visibleGroups).toHaveLength(15);
    expect(result.current.hasMore).toBe(true);
  });

  it("reveals more groups on loadMore", () => {
    const groups = makeGroups(40);
    const { result } = renderHook(() => usePaginatedGroups(groups, 15));

    act(() => result.current.loadMore());
    expect(result.current.visibleGroups).toHaveLength(30);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.visibleGroups).toHaveLength(40);
    expect(result.current.hasMore).toBe(false);
  });

  it("does not report hasMore when everything already fits on one page", () => {
    const groups = makeGroups(5);
    const { result } = renderHook(() => usePaginatedGroups(groups, 15));
    expect(result.current.visibleGroups).toHaveLength(5);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets to the first page when the underlying result set changes", () => {
    const { result, rerender } = renderHook(
      ({ groups }: { groups: DeliveryGroup[] }) => usePaginatedGroups(groups, 15),
      { initialProps: { groups: makeGroups(40) } },
    );

    act(() => result.current.loadMore());
    expect(result.current.visibleGroups).toHaveLength(30);

    rerender({ groups: makeGroups(5) });
    expect(result.current.visibleGroups).toHaveLength(5);
  });
});
