import { API_BASE_URL, storeAccessHeaders } from "@/lib/api-client";

// Why a store code + passcode pair was refused (frontend-contract.md §10).
export type StoreAccessProblem = "wrong_passcode" | "store_not_set_up" | "too_many_attempts" | "network" | "failed";

export type StoreAccessResult = { ok: true } | { ok: false; problem: StoreAccessProblem };

// Checks a pair before it's saved, by asking GET /api/stores/current with it.
// Sends the pair being tried rather than the saved session — so not through
// backendFetch, which would forget the phone's current passcode if this one
// is wrong.
export async function verifyStoreAccess(storeCode: string, passcode: string): Promise<StoreAccessResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/stores/current`, { headers: storeAccessHeaders(storeCode, passcode) });
  } catch {
    return { ok: false, problem: "network" };
  }
  if (res.ok) return { ok: true };

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 429) return { ok: false, problem: "too_many_attempts" };
  if (body.error === "store_not_set_up") return { ok: false, problem: "store_not_set_up" };
  if (res.status === 401) return { ok: false, problem: "wrong_passcode" };
  return { ok: false, problem: "failed" };
}
