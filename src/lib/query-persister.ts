import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { openDB, type IDBPDatabase } from "idb";
import { readStoreCode } from "./store-session-storage";

// Keeps the TanStack Query cache in IndexedDB so search and recent uploads
// open offline from the last successful fetch (frontend-left-to-do.md §4).
// The saved copy is stamped with the store it belongs to: it's only restored
// under that same store, and it's deleted as soon as no store is signed in,
// so one store's deliveries never show under another (or after sign-out).

const DB_NAME = "inventory-helper";
const STORE_NAME = "query-cache";
const KEY = "client";

interface SavedCache {
  storeCode: string;
  client: PersistedClient;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function openCacheDb() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  return dbPromise;
}

// Saving is best-effort: a phone without IndexedDB (or out of space) just
// doesn't get offline data, the app still works online.
async function deleteSaved() {
  try {
    await (await openCacheDb()).delete(STORE_NAME, KEY);
  } catch {}
}

async function writeSaved(saved: SavedCache) {
  try {
    await (await openCacheDb()).put(STORE_NAME, saved, KEY);
  } catch {}
}

async function readSaved(): Promise<SavedCache | undefined> {
  try {
    return await (await openCacheDb()).get(STORE_NAME, KEY);
  } catch {
    return undefined;
  }
}

// The cache changes on every fetch state change, so writes are batched:
// the latest snapshot is written `throttleMs` after the first change.
export function createQueryPersister({ throttleMs = 1000 }: { throttleMs?: number } = {}): Persister {
  let pending: SavedCache | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancelPending = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
  };

  const flush = async () => {
    const saved = pending;
    cancelPending();
    if (saved) await writeSaved(saved);
  };

  return {
    persistClient(client) {
      const storeCode = readStoreCode();
      if (!storeCode) {
        cancelPending();
        return deleteSaved();
      }
      pending = { storeCode, client };
      timer ??= setTimeout(() => void flush(), throttleMs);
    },
    async restoreClient() {
      const saved = await readSaved();
      if (!saved) return undefined;
      if (saved.storeCode !== readStoreCode()) {
        await deleteSaved();
        return undefined;
      }
      return saved.client;
    },
    removeClient() {
      cancelPending();
      return deleteSaved();
    },
  };
}
