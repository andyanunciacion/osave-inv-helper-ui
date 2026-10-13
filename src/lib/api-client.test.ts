import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendFetch, resolveApiBaseUrl } from "./api-client";
import { readStoreCode, readStorePasscode, saveStoreSession } from "./store-session-storage";

const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function sentHeaders(): Headers {
  return fetchMock.mock.calls[0][1].headers as Headers;
}

describe("resolveApiBaseUrl", () => {
  it("drops trailing slashes and surrounding spaces", () => {
    expect(resolveApiBaseUrl(" https://api.example.com/ ")).toBe("https://api.example.com");
    expect(resolveApiBaseUrl("https://api.example.com//")).toBe("https://api.example.com");
  });

  it("falls back to the local server when unset or blank", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("http://localhost:4000");
    expect(resolveApiBaseUrl("  ")).toBe("http://localhost:4000");
  });
});

describe("backendFetch", () => {
  it("signs the request in as the session's store, keeping the caller's headers", async () => {
    saveStoreSession("245", "secret1");

    await backendFetch("/api/deliveries", { method: "POST", headers: { "Content-Type": "application/json" } });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:4000/api/deliveries");
    expect(sentHeaders().get("X-Store-Code")).toBe("245");
    expect(sentHeaders().get("X-Store-Passcode")).toBe("secret1");
    expect(sentHeaders().get("Content-Type")).toBe("application/json");
  });

  it("sends no store headers when there's no complete sign-in", async () => {
    window.localStorage.setItem("osave.store_code", "245");

    await backendFetch("/api/search");

    expect(sentHeaders().has("X-Store-Code")).toBe(false);
    expect(sentHeaders().has("X-Store-Passcode")).toBe(false);
  });

  it("forgets a passcode the backend refuses, keeping the store code", async () => {
    saveStoreSession("245", "old-pass");
    fetchMock.mockResolvedValue(new Response('{"error":"unauthorized"}', { status: 401 }));

    const res = await backendFetch("/api/search");

    expect(res.status).toBe(401);
    expect(readStorePasscode()).toBeNull();
    expect(readStoreCode()).toBe("245");
  });

  it("keeps the passcode on any other error", async () => {
    saveStoreSession("245", "secret1");
    fetchMock.mockResolvedValue(new Response('{"error":"rate_limited"}', { status: 429 }));

    await backendFetch("/api/ocr");

    expect(readStorePasscode()).toBe("secret1");
  });
});
