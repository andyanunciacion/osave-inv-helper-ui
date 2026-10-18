import "fake-indexeddb/auto";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQueryPersister } from "./query-persister";
import { clearStoreSession, saveStoreSession } from "./store-session-storage";

function client(marker: string): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: "1",
    clientState: {
      mutations: [],
      queries: [
        {
          queryKey: ["deliveries", "245", "recent", 5],
          queryHash: marker,
          state: { data: marker } as never,
        },
      ],
    },
  };
}

// Writes are batched on a timer; with throttleMs 0 one macrotask flushes it.
const flushWrites = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("createQueryPersister", () => {
  const persister = createQueryPersister({ throttleMs: 0 });

  beforeEach(() => {
    saveStoreSession("245", "test-passcode");
  });

  afterEach(async () => {
    await persister.removeClient();
    clearStoreSession();
  });

  it("restores what was saved under the same store", async () => {
    const saved = client("store-245");
    await persister.persistClient(saved);
    await flushWrites();

    expect(await persister.restoreClient()).toEqual(saved);
  });

  it("doesn't restore one store's data under another, and deletes it", async () => {
    await persister.persistClient(client("store-245"));
    await flushWrites();

    saveStoreSession("246", "other-passcode");
    expect(await persister.restoreClient()).toBeUndefined();

    saveStoreSession("245", "test-passcode");
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("deletes the saved copy once no store is signed in", async () => {
    await persister.persistClient(client("store-245"));
    await flushWrites();

    clearStoreSession();
    await persister.persistClient(client("after-sign-out"));
    saveStoreSession("245", "test-passcode");

    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("saves under the store that was signed in when the change happened", async () => {
    await persister.persistClient(client("store-245"));
    saveStoreSession("246", "other-passcode");
    await flushWrites();

    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("drops a batched write when the copy is removed before it goes out", async () => {
    await persister.persistClient(client("store-245"));
    await persister.removeClient();
    await flushWrites();

    expect(await persister.restoreClient()).toBeUndefined();
  });
});
