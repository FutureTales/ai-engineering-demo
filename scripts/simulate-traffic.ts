/**
 * Synthetic traffic for the drift demo (paso-09).
 *
 *   pnpm tsx scripts/simulate-traffic.ts            -> insert 2 synthetic weeks
 *   pnpm tsx scripts/simulate-traffic.ts --clean    -> delete all synthetic rows
 *
 * Inserts conversations flagged is_synthetic = true (never mixed with real
 * traffic in the health metrics):
 * - "baseline" week (14 to 8 days ago): the usual mix of work lines.
 * - "drift" week (last 7 days): an avalanche of intellectual-property requests
 *   (e.g. after a trademark workshop), so business_innovation dominates.
 *
 * The line of each synthetic conversation is assigned by construction from
 * the week's mix (seeded PRNG, reproducible). The panel's drift chart compares
 * the two weeks' distributions.
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { mulberry32 } from "../lib/tools/queue";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: ".env.local", quiet: true });

type Line = "quality_assurance" | "business_innovation" | "process_design";
const rand = mulberry32(2026);
const DAY = 24 * 3600 * 1000;

// Share of each line per week. Baseline ≈ the mix of the seed data; drift = IP avalanche.
const WEEKS: { name: string; daysAgoFrom: number; count: number; mix: Record<Line, number> }[] = [
  {
    name: "baseline",
    daysAgoFrom: 14,
    count: 60,
    mix: { quality_assurance: 0.3, business_innovation: 0.3, process_design: 0.4 },
  },
  {
    name: "drift",
    daysAgoFrom: 7,
    count: 70,
    mix: { quality_assurance: 0.15, business_innovation: 0.65, process_design: 0.2 },
  },
];

function pickLine(mix: Record<Line, number>): Line {
  const r = rand();
  let acc = 0;
  for (const [line, p] of Object.entries(mix) as [Line, number][]) {
    acc += p;
    if (r < acc) return line;
  }
  return "process_design";
}

async function main() {
  const db = createAdminClient();
  if (process.argv.includes("--clean")) {
    const { error, count } = await db
      .from("conversations")
      .delete({ count: "exact" })
      .eq("is_synthetic", true);
    if (error) throw error;
    console.log(`deleted ${count} synthetic conversations (their interactions cascade)`);
    return;
  }

  const rows: {
    id: string;
    session_id: string;
    prompt_version: string;
    line: Line;
    message_count: number;
    has_proposal: boolean;
    is_synthetic: boolean;
    started_at: string;
    last_message_at: string;
  }[] = [];
  for (const w of WEEKS) {
    for (let i = 0; i < w.count; i++) {
      const started = Date.now() - w.daysAgoFrom * DAY + rand() * 7 * DAY;
      rows.push({
        id: randomUUID(),
        session_id: `synthetic-${w.name}`,
        prompt_version: "synthetic",
        line: pickLine(w.mix),
        message_count: 2 + Math.floor(rand() * 5),
        has_proposal: rand() < 0.35,
        is_synthetic: true,
        started_at: new Date(started).toISOString(),
        last_message_at: new Date(started + (2 + rand() * 10) * 60_000).toISOString(),
      });
    }
  }
  const { error } = await db.from("conversations").insert(rows);
  if (error) throw error;
  const summary = WEEKS.map((w) => {
    const r = rows.filter((x) => x.session_id === `synthetic-${w.name}`);
    const by = (l: Line) => r.filter((x) => x.line === l).length;
    return `${w.name}: ${r.length} (calidad ${by("quality_assurance")}, innovación ${by("business_innovation")}, procesos ${by("process_design")})`;
  });
  console.log(`inserted ${rows.length} synthetic conversations\n  ${summary.join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
