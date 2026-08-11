import { afterEach, describe, expect, it } from "vitest";
import { OWNER_HEADER } from "../ownerHeader";
import { isOwnerRequest } from "../server/owner";

const original = {
  token: process.env.KAI_OWNER_TOKEN,
  nodeEnv: process.env.NODE_ENV,
};

function setEnv(token: string | undefined, nodeEnv: string) {
  if (token === undefined) delete process.env.KAI_OWNER_TOKEN;
  else process.env.KAI_OWNER_TOKEN = token;
  // NODE_ENV is readonly in the types but writable at runtime.
  (process.env as Record<string, string>).NODE_ENV = nodeEnv;
}

const request = (token?: string) =>
  new Request("https://kai.test/api/calendar", {
    method: "POST",
    headers: token ? { [OWNER_HEADER]: token } : {},
  });

afterEach(() => {
  setEnv(original.token, original.nodeEnv ?? "test");
});

describe("isOwnerRequest", () => {
  it("locks the connected accounts in production when no token is configured", () => {
    setEnv(undefined, "production");
    expect(isOwnerRequest(request())).toBe(false);
    expect(isOwnerRequest(request("anything"))).toBe(false);
  });

  it("stays open in local development so dev keeps working", () => {
    setEnv(undefined, "development");
    expect(isOwnerRequest(request())).toBe(true);
  });

  it("accepts only the exact configured token", () => {
    setEnv("s3cret", "production");
    expect(isOwnerRequest(request("s3cret"))).toBe(true);
    expect(isOwnerRequest(request("S3CRET"))).toBe(false);
    expect(isOwnerRequest(request("wrong"))).toBe(false);
    expect(isOwnerRequest(request())).toBe(false);
  });

  it("ignores surrounding whitespace on both sides", () => {
    setEnv("  s3cret  ", "production");
    expect(isOwnerRequest(request(" s3cret "))).toBe(true);
  });

  it("never treats an empty header as the owner", () => {
    setEnv("s3cret", "production");
    expect(isOwnerRequest(request("   "))).toBe(false);
  });
});
