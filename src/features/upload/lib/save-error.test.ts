import { describe, expect, it } from "vitest";
import { DeliveryRequestError } from "@/features/deliveries/lib/request-error";
import { describeSaveError } from "./save-error";

describe("describeSaveError", () => {
  it("calls a request that never got an answer a connection problem", () => {
    expect(describeSaveError(new TypeError("Failed to fetch"))).toBe(
      "Couldn't reach the server. Check your connection and try again.",
    );
  });

  it("names the header fields a 400 rejected, instead of blaming the connection", () => {
    const err = new DeliveryRequestError(400, "invalid_body", ["delivery_date"]);
    expect(describeSaveError(err)).toBe(
      "The server didn't accept this page — check Transaction date, then try again.",
    );
  });

  it("counts rejected item rows rather than numbering them", () => {
    const err = new DeliveryRequestError(400, "invalid_body", [
      "delivery_code",
      "items.2.quantity",
      "items.2.item_price",
      "items.5.unit",
    ]);
    expect(describeSaveError(err)).toBe(
      "The server didn't accept this page — check Inv. Tran. No. and 2 item rows, then try again.",
    );
  });

  it("falls back to a general hint when a 400 names no fields it recognises", () => {
    expect(describeSaveError(new DeliveryRequestError(400, "invalid_body", []))).toBe(
      "The server didn't accept this page — check the fields against the receipt, then try again.",
    );
  });

  it("calls a 5xx a server problem and says the edits are kept", () => {
    expect(describeSaveError(new DeliveryRequestError(500, "internal_error", []))).toBe(
      "The server had a problem saving this page. Your changes are kept — try again in a moment.",
    );
  });

  it("includes the status for any other refusal", () => {
    expect(describeSaveError(new DeliveryRequestError(404, "not_found", []))).toBe(
      "The server couldn't save this page (error 404). Your changes are kept — try again.",
    );
  });
});

describe("DeliveryRequestError.fromResponse", () => {
  it("reads the backend's error code and the rejected field paths", async () => {
    const res = new Response(
      JSON.stringify({
        error: "invalid_body",
        issues: [{ path: ["delivery_date"] }, { path: ["items", 3, "quantity"] }, { path: [] }],
      }),
      { status: 400 },
    );
    const err = await DeliveryRequestError.fromResponse(res);
    expect(err).toMatchObject({ status: 400, code: "invalid_body", fields: ["delivery_date", "items.3.quantity"] });
  });

  it("copes with a body that isn't JSON", async () => {
    const err = await DeliveryRequestError.fromResponse(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(err).toMatchObject({ status: 502, code: null, fields: [] });
  });
});
