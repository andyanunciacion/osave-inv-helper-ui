import { useEffect } from "react";

// Jumps the window back to the top whenever `view` changes (and on mount).
// The upload flow swaps one long screen for another in place — confirming a
// page while scrolled down to its Confirm button would otherwise open the next
// page, result or summary part-way down, past its header.
export function useScrollToTop(view: unknown) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view]);
}
