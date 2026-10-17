import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { chooseStoreCode, normalizeStoreCode } from "@/lib/store-session-storage";
import { setQrSignInProblem } from "../lib/qr-sign-in-problem";
import { signInToStore } from "../lib/sign-in";
import { parseStoreQr } from "../lib/store-qr";

// Signs in from a scanned store QR code (lib/store-qr.ts) with no typing.
// When that can't happen — an older QR code without the passcode, or a pair
// the backend refused (e.g. the passcode was changed since it was printed) —
// the store is still picked, and the store screen asks for the passcode,
// showing why.
export type QrSignInOutcome = "signed-in" | "needs-passcode" | "unreadable";

export interface UseQrSignInResult {
  signInWithQr: (raw: string) => Promise<QrSignInOutcome>;
  // The store being checked with the backend, while it is.
  signingInStoreCode: string | null;
  // The last scan wasn't a store QR code.
  errorMessage: string | null;
}

export function useQrSignIn(): UseQrSignInResult {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutateAsync, isPending, variables } = useMutation({
    mutationFn: ({ storeCode, passcode }: { storeCode: string; passcode: string }) =>
      signInToStore(storeCode, passcode),
  });

  const signInWithQr = async (raw: string): Promise<QrSignInOutcome> => {
    setQrSignInProblem(null);
    const qr = parseStoreQr(raw);
    const storeCode = qr ? normalizeStoreCode(qr.storeCode) : "";
    if (!qr || !storeCode) {
      setErrorMessage("That isn't a store QR code. Scan the store's sign-in QR code.");
      return "unreadable";
    }
    setErrorMessage(null);

    if (qr.passcode === null) {
      chooseStoreCode(storeCode);
      return "needs-passcode";
    }

    const problem = await mutateAsync({ storeCode, passcode: qr.passcode });
    if (problem === null) return "signed-in";
    chooseStoreCode(storeCode);
    setQrSignInProblem(problem);
    return "needs-passcode";
  };

  return {
    signInWithQr,
    signingInStoreCode: isPending ? (variables?.storeCode ?? null) : null,
    errorMessage,
  };
}
