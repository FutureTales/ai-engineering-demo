/**
 * Verify the abuse protections against the real database (paso-06).
 *
 *   pnpm tsx scripts/test-rate-limit.ts [baseUrl]
 *
 * 1. hit_rate_limit is atomic: 3 concurrent hits with max = 2 -> exactly one is rejected.
 * 2. If a baseUrl of a server started with RATE_LIMIT_MAX_MESSAGES=1 is given,
 *    the second message from the same session gets HTTP 429 (only one model call is spent).
 *
 * Test keys are prefixed with "test:" and deleted at the end.
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: ".env.local", quiet: true });

async function main() {
  const db = createAdminClient();
  const key = `test:${randomUUID()}`;
  const hits = await Promise.all(
    [1, 2, 3].map(() => db.rpc("hit_rate_limit", { p_key: key, p_window_seconds: 60, p_max: 2 })),
  );
  const allowed = hits.map((h) => (h.data as { allowed: boolean }[])[0].allowed);
  const counts = hits.map((h) => (h.data as { current_count: number }[])[0].current_count).sort();
  await db.from("rate_limits").delete().like("key", "test:%");
  const atomic = allowed.filter((a) => !a).length === 1 && counts.join(",") === "1,2,3";
  console.log(
    `1. atomic counter: allowed=${JSON.stringify(allowed)} counts=${counts} -> ${atomic ? "OK" : "FAIL"}`,
  );

  const base = process.argv[2];
  let route: { first: number; second: number; retryAfter: string | null; body: string } | null = null;
  if (base) {
    const id = randomUUID();
    const msg = (text: string, i: number) => ({ id: `u${i}`, role: "user", parts: [{ type: "text", text }] });
    const send = (messages: unknown[]) =>
      fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, messages }),
      });
    const r1 = await send([msg("Hola, tengo una panadería.", 0)]);
    await r1.text();
    const r2 = await send([msg("Hola, tengo una panadería.", 0), msg("¿Y cuánto cuesta?", 1)]);
    route = {
      first: r1.status,
      second: r2.status,
      retryAfter: r2.headers.get("retry-after"),
      body: await r2.text(),
    };
    console.log(
      `2. route: first=${route.first} second=${route.second} retry-after=${route.retryAfter} body=${route.body}`,
    );
  }

  writeFileSync(
    "docs/evidencia/paso-06/rate-limit.json",
    JSON.stringify(
      { recordedAt: new Date().toISOString(), atomicCounter: { allowed, counts, ok: atomic }, route },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
