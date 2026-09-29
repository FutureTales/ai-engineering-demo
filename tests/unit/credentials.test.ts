import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidKeyError, resolveCredentials } from "@/lib/ai/credentials";

const KEY = `sk-ant-api03-${"a".repeat(40)}`;
const VOYAGE = `pa-${"b".repeat(40)}`;
const h = (entries: Record<string, string> = {}) => new Headers(entries);

afterEach(() => vi.unstubAllEnvs());

describe("resolveCredentials (bring your own key)", () => {
  it("public deployment without a server key and without a user key -> demo mode", () => {
    vi.stubEnv("AI_MODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(resolveCredentials(h())).toEqual({ mode: "mock", source: "none" });
  });

  it("uses the user's key when sent, never the server's", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", `sk-ant-server-${"z".repeat(40)}`);
    vi.stubEnv("VOYAGE_API_KEY", `pa-server-${"z".repeat(40)}`);
    const c = resolveCredentials(h({ "x-anthropic-key": KEY }));
    expect(c).toMatchObject({ mode: "live", source: "user", anthropicKey: KEY });
    // No user Voyage key -> no embeddings (full-text search), not the server's Voyage key.
    expect(c.voyageKey).toBeUndefined();
  });

  it("passes the user's Voyage key when given", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(resolveCredentials(h({ "x-anthropic-key": KEY, "x-voyage-key": VOYAGE })).voyageKey).toBe(VOYAGE);
  });

  it("falls back to the server key (local development / self-hosted copy)", () => {
    vi.stubEnv("AI_MODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", KEY);
    expect(resolveCredentials(h())).toMatchObject({ mode: "live", source: "server" });
  });

  it("AI_MODE=mock always wins", () => {
    vi.stubEnv("AI_MODE", "mock");
    expect(resolveCredentials(h({ "x-anthropic-key": KEY })).mode).toBe("mock");
  });

  it("rejects malformed keys", () => {
    vi.stubEnv("AI_MODE", "");
    expect(() => resolveCredentials(h({ "x-anthropic-key": "hola" }))).toThrow(InvalidKeyError);
    expect(() => resolveCredentials(h({ "x-anthropic-key": KEY, "x-voyage-key": "x" }))).toThrow(
      InvalidKeyError,
    );
  });
});
