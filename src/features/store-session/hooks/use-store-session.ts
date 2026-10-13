import { useSyncExternalStore } from "react";
import {
  chooseStoreCode,
  clearStoreSession,
  readStoreCode,
  readStorePasscode,
  subscribeStoreSession,
} from "@/lib/store-session-storage";

// Flow A, AI_DOCS/main-file.md §6: the signed-in store (code + passcode) lives
// in localStorage (src/lib/store-session-storage.ts) and scopes every screen
// until changed. useSyncExternalStore handles the server/client snapshot
// difference (SSR has no localStorage) without a manual hydration-effect. The
// passcode itself never leaves the storage module except as a request
// header — screens only need to know whether there is one.

function getHasPasscode() {
  return readStorePasscode() !== null;
}

function getServerSnapshot() {
  return null;
}

function getServerHasPasscode() {
  return false;
}

export interface UseStoreSessionResult {
  storeCode: string | null;
  // The backend accepted a passcode for storeCode and it hasn't been refused
  // since. Without one, store-scoped screens send staff back to enter it.
  hasPasscode: boolean;
  // Picks a store without signing in to it yet (a scanned QR code).
  chooseStore: (code: string) => void;
  clearStoreCode: () => void;
}

export function useStoreSession(): UseStoreSessionResult {
  const storeCode = useSyncExternalStore(subscribeStoreSession, readStoreCode, getServerSnapshot);
  const hasPasscode = useSyncExternalStore(subscribeStoreSession, getHasPasscode, getServerHasPasscode);

  return { storeCode, hasPasscode, chooseStore: chooseStoreCode, clearStoreCode: clearStoreSession };
}
