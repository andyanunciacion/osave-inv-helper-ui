import { forgetStorePasscode, readStoreCode, readStorePasscode } from "./store-session-storage";

// NEXT_PUBLIC_API_URL is pasted into the host's settings by hand, so a blank
// value falls back to the local server and a trailing slash is dropped —
// "https://api.example.com/" + "/api/..." would be a "//api" path the backend
// doesn't route. Next.js inlines the value at build time: changing it on the
// host needs a redeploy.
export function resolveApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  return trimmed || "http://localhost:4000";
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

// frontend-contract.md §10: every /api request is signed in to one store with
// these two headers.
export const STORE_CODE_HEADER = "X-Store-Code";
export const STORE_PASSCODE_HEADER = "X-Store-Passcode";

export function storeAccessHeaders(storeCode: string, passcode: string): Record<string, string> {
  return { [STORE_CODE_HEADER]: storeCode, [STORE_PASSCODE_HEADER]: passcode };
}

// Every backend call goes through here. It signs the request in as the
// session's store, and when the backend refuses that (401: the passcode was
// changed, or the store isn't set up any more) it forgets the passcode, which
// sends staff back to the store screen to re-enter it (useRequireStoreSession).
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const storeCode = readStoreCode();
  const passcode = readStorePasscode();
  if (storeCode && passcode) {
    for (const [name, value] of Object.entries(storeAccessHeaders(storeCode, passcode))) headers.set(name, value);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) forgetStorePasscode();
  return res;
}
