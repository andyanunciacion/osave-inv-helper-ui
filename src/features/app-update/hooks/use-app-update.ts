import { useSerwist } from "@serwist/turbopack/react";
import { useCallback, useEffect, useState } from "react";

export interface UseAppUpdateResult {
  // A new version is installed and waiting for Reload.
  updateReady: boolean;
  // Switches to the new version and reloads the page.
  reload: () => void;
  // Hides the banner; the new version still loads on the next cold start.
  dismiss: () => void;
}

// The "update ready" banner's state. The service worker (src/lib/sw.ts)
// doesn't take over on its own, so a deploy never swaps code under a
// half-filled review; staff pick when to reload.
export function useAppUpdate(): UseAppUpdateResult {
  const { serwist } = useSerwist();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setUpdateReady(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  const reload = useCallback(() => {
    if (!serwist) return;
    // The waiting version takes control once it's told to skip waiting;
    // reload then so the page runs that version's code.
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  }, [serwist]);

  const dismiss = useCallback(() => setUpdateReady(false), []);

  return { updateReady, reload, dismiss };
}
