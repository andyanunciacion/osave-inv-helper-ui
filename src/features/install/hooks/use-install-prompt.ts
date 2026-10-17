import { useSyncExternalStore } from "react";
import {
  dismissInstallTip,
  promptInstall,
  readInstallTip,
  subscribeInstallPrompt,
} from "../lib/install-prompt-store";
import type { InstallTipKind } from "../types";

function getServerSnapshot() {
  return null;
}

export interface UseInstallPromptResult {
  // null: nothing to show (installed, dismissed, or no way to install here).
  tip: InstallTipKind | null;
  // Opens Chrome's install dialog (tip "install-button" only).
  install: () => Promise<void>;
  // Hides the tip on this phone for good.
  dismiss: () => void;
}

// The "install this app" tip (AI_DOCS/main-file.md §9). The browser-side
// state lives in install-prompt-store.ts; useSyncExternalStore gives the
// server render (no window) a null tip without a hydration effect.
export function useInstallPrompt(): UseInstallPromptResult {
  const tip = useSyncExternalStore(subscribeInstallPrompt, readInstallTip, getServerSnapshot);

  return { tip, install: promptInstall, dismiss: dismissInstallTip };
}
