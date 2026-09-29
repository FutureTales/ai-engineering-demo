/**
 * "Bring your own key": who pays for each answer?
 *
 * - The user's own key (sent by the browser in a header, per request) -> live model.
 * - A server key (only for local development or a self-hosted copy) -> live model.
 * - Neither -> demo mode (recorded answers, zero cost).
 *
 * The public deployment has NO server key, so it can never spend the project's
 * credit. A user's key is used for that request only: it is never stored,
 * logged or written to telemetry.
 */
export const ANTHROPIC_KEY_HEADER = "x-anthropic-key";
export const VOYAGE_KEY_HEADER = "x-voyage-key";

export type KeySource = "user" | "server" | "none";

export interface Credentials {
  mode: "live" | "mock";
  source: KeySource;
  anthropicKey?: string;
  voyageKey?: string;
}

export function isPlausibleAnthropicKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(key);
}

export function isPlausibleVoyageKey(key: string): boolean {
  return /^pa-[A-Za-z0-9_-]{20,200}$/.test(key);
}

export class InvalidKeyError extends Error {}

/** Whether this server can answer live without a user key (local dev / self-hosted copy). */
export function serverHasOwnKey(): boolean {
  return process.env.AI_MODE !== "mock" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function resolveCredentials(headers: Headers): Credentials {
  if (process.env.AI_MODE === "mock") return { mode: "mock", source: "none" };

  const userKey = headers.get(ANTHROPIC_KEY_HEADER)?.trim();
  const userVoyage = headers.get(VOYAGE_KEY_HEADER)?.trim();
  if (userVoyage && !isPlausibleVoyageKey(userVoyage)) throw new InvalidKeyError("voyage");

  if (userKey) {
    if (!isPlausibleAnthropicKey(userKey)) throw new InvalidKeyError("anthropic");
    // The user pays for the model; embeddings only with the user's own Voyage key (else full-text search).
    return { mode: "live", source: "user", anthropicKey: userKey, voyageKey: userVoyage || undefined };
  }
  if (serverHasOwnKey()) {
    return {
      mode: "live",
      source: "server",
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      voyageKey: userVoyage || process.env.VOYAGE_API_KEY || undefined,
    };
  }
  return { mode: "mock", source: "none" };
}
