/**
 * Abuse protection for the public URL (the QR code at the talk):
 * - per session: RATE_LIMIT_MAX_MESSAGES (20) every RATE_LIMIT_WINDOW_MINUTES (10)
 * - per IP: RATE_LIMIT_IP_MAX (200) in the same window (a room shares one IP)
 * - global: DAILY_CONVERSATION_CAP new conversations per day
 *
 * Counters live in Postgres (public.rate_limits, atomic upsert via hit_rate_limit),
 * so they work across serverless instances. In mock mode there is no database:
 * limits are not applied.
 */
import { ipAddress } from "@vercel/functions";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LimitDecision {
  allowed: boolean;
  reason?: "rate_limit" | "daily_cap";
  retryAfterSeconds?: number;
}

const num = (v: string | undefined, fallback: number) => (v && Number(v) > 0 ? Number(v) : fallback);

/** Salted with a SECRET (RATE_LIMIT_SALT), so stored hashes cannot be reversed by brute force. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.RATE_LIMIT_SALT ?? "dev-only-salt"}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Client IP as reported by Vercel's edge (not a client-supplied header).
 * IPv6 addresses are bucketed by /64, since one client usually controls a whole /64.
 */
export function clientIp(req: Request): string {
  const ip = ipAddress(req) ?? req.headers.get("x-real-ip") ?? "unknown";
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::/64";
  return ip;
}

/** True the first time a conversation id is seen (atomic insert-or-ignore). */
export async function registerConversation(conversationId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("conversations")
    .upsert({ id: conversationId, session_id: conversationId }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return (data ?? []).length === 1;
}

/** Limit for the staff magic-link form: 5 requests per IP every 10 minutes. */
export async function checkLoginLimit(ipHash: string): Promise<boolean> {
  return (await hit(`login:${ipHash}`, 600, 5)).allowed;
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
  const sessionMax = num(process.env.RATE_LIMIT_MAX_MESSAGES, 20);
  // A whole room (the talk!) usually shares ONE public IP on campus Wi-Fi, so the
  // per-IP budget must be much larger than the per-session one. Cost is bounded
  // by the daily cap and the provider's spend limit, not by the IP key.
  const ipMax = num(process.env.RATE_LIMIT_IP_MAX, 200);
  const windowSeconds = num(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) * 60;
  const dailyCap = num(process.env.DAILY_CONVERSATION_CAP, 300);

  for (const [key, max] of [
    [`ip:${opts.ipHash}`, ipMax],
    [`session:${opts.sessionId}`, sessionMax],
  ] as const) {
    const r = await hit(key, windowSeconds, max);
    if (!r.allowed) return { allowed: false, reason: "rate_limit", retryAfterSeconds: r.retryAfterSeconds };
  }
  if (opts.isNewConversation) {
    const r = await hit("daily:conversations", 24 * 3600, dailyCap);
    if (!r.allowed) return { allowed: false, reason: "daily_cap", retryAfterSeconds: r.retryAfterSeconds };
  }
  return { allowed: true };
}
