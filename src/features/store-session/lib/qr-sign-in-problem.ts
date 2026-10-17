// Why a scanned QR code's store + passcode were refused, handed from the scan
// screen to the store screen it sends staff back to. In memory only: it
// outlives the client-side navigation between them but not a reload, and any
// new sign-in attempt clears it.

let problem: string | null = null;
const listeners = new Set<() => void>();

export function readQrSignInProblem(): string | null {
  return problem;
}

export function setQrSignInProblem(message: string | null) {
  if (message === problem) return;
  problem = message;
  for (const listener of listeners) listener();
}

export function subscribeQrSignInProblem(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
