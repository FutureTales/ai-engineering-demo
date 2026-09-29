/**
 * Abuse protection for the public URL (the QR code at the talk):
 * - per IP and per session: RATE_LIMIT_MAX_MESSAGES every RATE_LIMIT_WINDOW_MINUTES
 * - global: DAILY_CONVERSATION_CAP new conversations per day
 *
 * Counters live in Postgres (public.rate_limits, atomic upsert via hit_rate_limit),
 * so they work across serverless instances. In mock mode there is no database:
 * limits are not applied.
 */
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LimitDecision {
  allowed: boolean;
  reason?: "rate_limit" | "daily_cap";
  retryAfterSeconds?: number;
}

const num = (v: string | undefined, fallback: number) => (v && Number(v) > 0 ? Number(v) : fallback);

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.SUPABASE_PROJECT_REF ?? "innova"}`)
    .digest("hex")
    .slice(0, 32);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown"
  );
}

async function hit(key: string, windowSeconds: number, max: number) {
  const db = createAdminClient();
  const { data, error } = await db.rpc("hit_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw error;
  const row = (data as { allowed: boolean; current_count: number; reset_at: string }[])[0];
  return {
    allowed: row.allowed,
    retryAfterSeconds: Math.max(1, Math.ceil((Date.parse(row.reset_at) - Date.now()) / 1000)),
  };
}

export async function checkLimits(opts: {
  ipHash: string;
  sessionId: string;
  isNewConversation: boolean;
}): Promise<LimitDecision> {
  const max = num(process.env.RATE_LIMIT_MAX_MESSAGES, 20);
  const windowSeconds = num(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) * 60;
  const dailyCap = num(process.env.DAILY_CONVERSATION_CAP, 300);

  for (const key of [`ip:${opts.ipHash}`, `session:${opts.sessionId}`]) {
    const r = await hit(key, windowSeconds, max);
    if (!r.allowed) return { allowed: false, reason: "rate_limit", retryAfterSeconds: r.retryAfterSeconds };
  }
  if (opts.isNewConversation) {
    const r = await hit("daily:conversations", 24 * 3600, dailyCap);
    if (!r.allowed) return { allowed: false, reason: "daily_cap", retryAfterSeconds: r.retryAfterSeconds };
  }
  return { allowed: true };
}
