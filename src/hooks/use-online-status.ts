import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

// Whether the phone has a connection, as TanStack Query sees it — the same
// signal that pauses queries while offline, so a screen never says "offline"
// while its data is still being fetched, or the other way round. It follows
// the browser's online/offline events (seeded from navigator.onLine in
// src/lib/query-client.ts), so Wi-Fi with no internet still counts as online;
// a request then fails with its own "couldn't reach the server" message.
// Offline mode is read-only (frontend-left-to-do.md §4): uploads and edits
// are disabled while this is false.

function subscribe(onChange: () => void) {
  return onlineManager.subscribe(onChange);
}

function getSnapshot() {
  return onlineManager.isOnline();
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
