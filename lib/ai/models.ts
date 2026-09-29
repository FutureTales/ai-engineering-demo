/**
 * Single source of truth for model IDs and prices.
 *
 * IDs verified against GET /v1/models on 2026-09-29.
 * Prices (USD per million tokens) copied from
 * https://platform.claude.com/docs/en/about-claude/pricing on 2026-09-29.
 */
import type { LanguageModelUsage } from "ai";

export const MODELS = {
  /** Conversational agent. */
  agent: "claude-sonnet-5-5",
  /** Cheap and fast: LLM classifier and LLM-as-judge. */
  fast: "claude-haiku-4-5-20251001",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

interface Pricing {
  input: number;
  cacheWrite5m: number;
  cacheRead: number;
  output: number;
}

export const PRICING_USD_PER_MTOK: Record<ModelId, Pricing> = {
  "claude-sonnet-5-5": { input: 2, cacheWrite5m: 2.5, cacheRead: 0.2, output: 10 },
  "claude-haiku-4-5-20251001": { input: 1, cacheWrite5m: 1.25, cacheRead: 0.1, output: 5 },
};

export interface UsageBreakdown {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}

export function toUsageBreakdown(usage: LanguageModelUsage): UsageBreakdown {
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  const uncached =
    usage.inputTokenDetails?.noCacheTokens ??
    Math.max(0, (usage.inputTokens ?? 0) - cacheReadTokens - cacheWriteTokens);
  return {
    inputTokens: uncached,
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens: usage.outputTokens ?? 0,
  };
}

/** Estimated cost in USD. Uncached input, cache reads/writes and output are priced separately. */
export function estimateCostUsd(model: ModelId, u: UsageBreakdown): number {
  const p = PRICING_USD_PER_MTOK[model];
  return (
    (u.inputTokens * p.input +
      u.cacheReadTokens * p.cacheRead +
      u.cacheWriteTokens * p.cacheWrite5m +
      u.outputTokens * p.output) /
    1_000_000
  );
}
