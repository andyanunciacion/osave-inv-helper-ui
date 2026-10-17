// Chrome's install prompt event (not in TypeScript's DOM lib): kept so the
// app can show the native install dialog from its own button later.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Which install tip to show, if any: an Install button (Chrome/Android hands
// over its prompt), or Add to Home Screen steps (iOS has no prompt to hand).
export type InstallTipKind = "install-button" | "ios-steps";
