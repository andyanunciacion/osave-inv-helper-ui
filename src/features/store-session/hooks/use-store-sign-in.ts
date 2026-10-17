import { useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";
import { normalizeStoreCode } from "@/lib/store-session-storage";
import { readQrSignInProblem, setQrSignInProblem, subscribeQrSignInProblem } from "../lib/qr-sign-in-problem";
import { signInToStore } from "../lib/sign-in";
import { useStoreSession } from "./use-store-session";

// The store screen's sign-in (§6 flow A, main-file.md §5 rule 9): a store code
// plus that store's passcode, checked with the backend before it's saved
// (lib/sign-in.ts).
export interface UseStoreSignInResult {
  // Resolves true once signed in.
  signIn: (storeCode: string, passcode: string) => Promise<boolean>;
  // The passcode box may be left blank: this phone already has the
  // passcode for that store code.
  canReusePasscode: (storeCode: string) => boolean;
  isPending: boolean;
  // This screen's last refusal, or else a scanned QR code's that sent staff
  // here.
  errorMessage: string | null;
}

function getServerQrSignInProblem() {
  return null;
}

export function useStoreSignIn(): UseStoreSignInResult {
  const { storeCode: savedStoreCode, hasPasscode } = useStoreSession();
  const qrProblem = useSyncExternalStore(subscribeQrSignInProblem, readQrSignInProblem, getServerQrSignInProblem);
  const { mutateAsync, isPending, data, reset } = useMutation({
    mutationFn: ({ storeCode, passcode }: { storeCode: string; passcode: string }) =>
      signInToStore(storeCode, passcode),
  });

  const canReusePasscode = (storeCode: string) =>
    hasPasscode && normalizeStoreCode(storeCode) === savedStoreCode;

  const signIn = async (rawStoreCode: string, passcode: string) => {
    const storeCode = normalizeStoreCode(rawStoreCode);
    if (!storeCode) return false;
    setQrSignInProblem(null);
    if (!passcode) {
      // Nothing to check: the saved passcode for this store still stands.
      if (!canReusePasscode(storeCode)) return false;
      reset();
      return true;
    }
    return (await mutateAsync({ storeCode, passcode })) === null;
  };

  return { signIn, canReusePasscode, isPending, errorMessage: data ?? qrProblem };
}
