import { forgetStorePasscode, readStoreCode, readStorePasscode } from "./store-session-storage";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
