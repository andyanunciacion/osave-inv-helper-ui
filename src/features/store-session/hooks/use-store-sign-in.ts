import { useMutation } from "@tanstack/react-query";
import { normalizeStoreCode, saveStoreSession } from "@/lib/store-session-storage";
import { verifyStoreAccess, type StoreAccessProblem } from "../lib/api";
import { useStoreSession } from "./use-store-session";

// The store screen's sign-in (§6 flow A, main-file.md §5 rule 9): a store code
// plus that store's passcode, checked with the backend before it's saved, so
// a typo shows up here rather than as a failed search later.
export interface UseStoreSignInResult {
  // Resolves true once signed in.
  signIn: (storeCode: string, passcode: string) => Promise<boolean>;
  // The passcode box may be left blank: this phone already has the
  // passcode for that store code.
  canReusePasscode: (storeCode: string) => boolean;
  isPending: boolean;
  errorMessage: string | null;
}

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

export function useStoreSignIn(): UseStoreSignInResult {
  const { storeCode: savedStoreCode, hasPasscode } = useStoreSession();
  const { mutateAsync, isPending, data, reset } = useMutation({
    mutationFn: async ({ storeCode, passcode }: { storeCode: string; passcode: string }) => {
      const result = await verifyStoreAccess(storeCode, passcode);
      if (result.ok) saveStoreSession(storeCode, passcode);
      return result.ok ? null : problemMessage(result.problem, storeCode);
    },
  });

  const canReusePasscode = (storeCode: string) =>
    hasPasscode && normalizeStoreCode(storeCode) === savedStoreCode;

  const signIn = async (rawStoreCode: string, passcode: string) => {
    const storeCode = normalizeStoreCode(rawStoreCode);
    if (!storeCode) return false;
    if (!passcode) {
      // Nothing to check: the saved passcode for this store still stands.
      if (!canReusePasscode(storeCode)) return false;
      reset();
      return true;
    }
    return (await mutateAsync({ storeCode, passcode })) === null;
  };

  return { signIn, canReusePasscode, isPending, errorMessage: data ?? null };
}
