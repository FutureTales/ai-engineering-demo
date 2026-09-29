import { createAdminClient } from "@/lib/supabase/admin";
import type { UsageBreakdown } from "@/lib/ai/models";

export interface InteractionRecord {
  conversationId: string;
  mode: "live" | "mock";
  model: string;
  promptVersion: string;
  usage: UsageBreakdown;
  costUsd: number;
  latencyMs: number;
  ttftMs: number | null;
  toolsUsed?: string[];
  error?: string | null;
}

/**
 * Persist one assistant turn to `interactions` (and upsert its conversation).
 * Telemetry must never break the chat: failures are logged, not thrown.
 */
export async function logInteraction(r: InteractionRecord): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const db = createAdminClient();
    const { error: convError } = await db.from("conversations").upsert(
      {
        id: r.conversationId,
        session_id: r.conversationId,
        prompt_version: r.promptVersion,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (convError) throw convError;

    const { error } = await db.from("interactions").insert({
      conversation_id: r.conversationId,
      mode: r.mode,
      model: r.model,
      prompt_version: r.promptVersion,
      input_tokens: r.usage.inputTokens,
      output_tokens: r.usage.outputTokens,
      cache_read_tokens: r.usage.cacheReadTokens,
      cache_write_tokens: r.usage.cacheWriteTokens,
      cost_usd: r.costUsd,
      latency_ms: r.latencyMs,
      ttft_ms: r.ttftMs,
      tools_used: r.toolsUsed ?? [],
      error: r.error ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[telemetry] failed to log interaction", err);
  }
}
