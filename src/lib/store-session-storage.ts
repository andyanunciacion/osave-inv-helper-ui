// Flow A, AI_DOCS/main-file.md §6: the signed-in store — its code and staff
// passcode — lives in localStorage and scopes every screen until changed.
// Framework-agnostic so both useStoreSession (React) and backendFetch (every
// API call) read the same values; listeners let React re-render when the
// API client forgets a passcode the backend refused.

const STORE_CODE_KEY = "osave.store_code";
const PASSCODE_KEY = "osave.store_passcode";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeStoreSession(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab signing in or out.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORE_CODE_KEY || event.key === PASSCODE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function normalizeStoreCode(code: string): string {
  return code.trim().toUpperCase();
}

export function readStoreCode(): string | null {
  return window.localStorage.getItem(STORE_CODE_KEY);
}

export function readStorePasscode(): string | null {
  return window.localStorage.getItem(PASSCODE_KEY);
}

// A passcode the backend accepted for this store.
export function saveStoreSession(storeCode: string, passcode: string) {
  window.localStorage.setItem(STORE_CODE_KEY, normalizeStoreCode(storeCode));
  window.localStorage.setItem(PASSCODE_KEY, passcode);
  notify();
}

// A store picked without its passcode yet (a scanned QR code). The passcode
// is kept only if it's the same store, so switching stores never sends one
// store's passcode with another's code.
export function chooseStoreCode(storeCode: string) {
  const normalized = normalizeStoreCode(storeCode);
  if (normalized !== readStoreCode()) window.localStorage.removeItem(PASSCODE_KEY);
  window.localStorage.setItem(STORE_CODE_KEY, normalized);
  notify();
}

// The backend refused the passcode (changed, or the store was reset): keep
// the store code so staff only retype the passcode.
export function forgetStorePasscode() {
  if (readStorePasscode() === null) return;
  window.localStorage.removeItem(PASSCODE_KEY);
  notify();
}

export function clearStoreSession() {
  window.localStorage.removeItem(STORE_CODE_KEY);
  window.localStorage.removeItem(PASSCODE_KEY);
  notify();
}
