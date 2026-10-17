// What a store's sign-in QR code holds (frontend-contract.md §10): JSON with
// the store code and its passcode, made by the backend's
// `npm run store:passcode`. Older QR codes hold only the store code as plain
// text — those still pick the store, and staff type the passcode.
export interface StoreQr {
  storeCode: string;
  passcode: string | null;
}

// null when it isn't a store QR code at all.
export function parseStoreQr(raw: string): StoreQr | null {
  const text = raw.trim();
  if (!text) return null;
  if (!text.startsWith("{")) return { storeCode: text, passcode: null };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const { store_code: storeCode, passcode } = value as Record<string, unknown>;
  if (typeof storeCode !== "string" || !storeCode.trim()) return null;
  if (passcode === undefined || passcode === null || passcode === "") {
    return { storeCode: storeCode.trim(), passcode: null };
  }
  if (typeof passcode !== "string") return null;
  return { storeCode: storeCode.trim(), passcode };
}
