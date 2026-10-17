import { describe, expect, it } from "vitest";
import { parseStoreQr } from "./store-qr";

describe("parseStoreQr", () => {
  it("reads the store code and passcode from a sign-in QR code", () => {
    expect(parseStoreQr('{"store_code":"245","passcode":"abc123!"}')).toEqual({
      storeCode: "245",
      passcode: "abc123!",
    });
  });

  it("keeps the passcode exactly as written", () => {
    expect(parseStoreQr('{"store_code":" st01 ","passcode":" Ab|c{1}"}')).toEqual({
      storeCode: "st01",
      passcode: " Ab|c{1}",
    });
  });

  it("reads an older QR code holding only the store code", () => {
    expect(parseStoreQr(" ST01 ")).toEqual({ storeCode: "ST01", passcode: null });
  });

  it.each([
    ['{"store_code":"ST01"}'],
    ['{"store_code":"ST01","passcode":""}'],
    ['{"store_code":"ST01","passcode":null}'],
  ])("treats %s as a store code without a passcode", (raw) => {
    expect(parseStoreQr(raw)).toEqual({ storeCode: "ST01", passcode: null });
  });

  it.each([
    [""],
    ["   "],
    ["{not json"],
    ["{}"],
    ['{"store_code":"  ","passcode":"abc123"}'],
    ['{"store_code":245,"passcode":"abc123"}'],
    ['{"store_code":"ST01","passcode":123456}'],
  ])("rejects %j", (raw) => {
    expect(parseStoreQr(raw)).toBeNull();
  });
});
