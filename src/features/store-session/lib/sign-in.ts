import { saveStoreSession } from "@/lib/store-session-storage";
import { verifyStoreAccess, type StoreAccessProblem } from "./api";

// Signing in to a store (§6 flow A, main-file.md §5 rule 9), shared by the
// store screen and a scanned QR code: the pair is checked with the backend
// before it's saved, so a typo shows up here rather than as a failed search
// later.

function problemMessage(problem: StoreAccessProblem, storeCode: string): string {
  switch (problem) {
    case "wrong_passcode":
      return `Wrong passcode for store ${storeCode}.`;
    case "store_not_set_up":
      return `Store ${storeCode} hasn't been set up yet. Ask your manager for its passcode.`;
    case "too_many_attempts":
      return "Too many wrong passcodes. Wait 15 minutes, then try again.";
    case "network":
      return "Couldn't reach the server. Check your connection and try again.";
    case "failed":
      return "Something went wrong. Try again.";
  }
}

// Resolves null once signed in, or why the pair was refused. storeCode is
// already normalized.
export async function signInToStore(storeCode: string, passcode: string): Promise<string | null> {
  const result = await verifyStoreAccess(storeCode, passcode);
  if (!result.ok) return problemMessage(result.problem, storeCode);
  saveStoreSession(storeCode, passcode);
  return null;
}
