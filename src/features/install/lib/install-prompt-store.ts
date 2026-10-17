import type { BeforeInstallPromptEvent, InstallTipKind } from "../types";

// AI_DOCS/main-file.md §9 installability: Chrome/Android hands over a native
// install prompt (beforeinstallprompt); iOS Safari has none, so staff get
// Add to Home Screen steps instead. Nothing shows once the app runs
// installed, or after staff dismiss the tip on this phone.
//
// Chrome fires beforeinstallprompt once per page load, often before any tip
// has mounted and never again on a client-side navigation, so the listener
// is attached when this module loads (src/app/providers.tsx imports it) and
// the event is kept here for whichever page shows the tip.

const DISMISSED_KEY = "osave.install_tip_dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Once dismissed, leave Chrome's own install UI alone.
    if (readDismissed()) return;
    // Our tip replaces Chrome's mini-infobar.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

// iPadOS reports itself as a Mac; touch support tells them apart.
export function isIos(nav: Pick<Navigator, "userAgent" | "maxTouchPoints">): boolean {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

// Running as the installed app rather than in a browser tab.
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function readInstallTip(): InstallTipKind | null {
  if (isStandalone() || readDismissed()) return null;
  if (deferredPrompt) return "install-button";
  if (isIos(navigator)) return "ios-steps";
  return null;
}

export function subscribeInstallPrompt(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

// Chrome's prompt can only be shown once, so the tip goes away whatever
// staff choose; Chrome fires beforeinstallprompt again if they can still
// install later.
export async function promptInstall(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) return;
  deferredPrompt = null;
  notify();
  await prompt.prompt();
  await prompt.userChoice;
}

export function dismissInstallTip() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage blocked: the tip just comes back next visit.
  }
  deferredPrompt = null;
  notify();
}
