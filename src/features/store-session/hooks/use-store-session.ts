import { useCallback, useSyncExternalStore } from "react";

// Flow A, AI_DOCS/main-file.md §6: store_code lives in localStorage and
// scopes every screen until changed. useSyncExternalStore handles the
// server/client snapshot difference (SSR has no localStorage) without a
// manual hydration-effect.
const STORAGE_KEY = "osave.store_code";
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorageEvent);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorageEvent);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

export interface UseStoreSessionResult {
  storeCode: string | null;
  setStoreCode: (code: string) => void;
  clearStoreCode: () => void;
}

export function useStoreSession(): UseStoreSessionResult {
  const storeCode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setStoreCode = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    window.localStorage.setItem(STORAGE_KEY, normalized);
    notifyListeners();
  }, []);

  const clearStoreCode = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }, []);

  return { storeCode, setStoreCode, clearStoreCode };
}
