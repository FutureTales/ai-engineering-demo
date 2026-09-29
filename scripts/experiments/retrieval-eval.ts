/**
 * Retrieval-only eval (paso-05): is an expected service among the top-3
 * retrieved documents? Measures the retriever separately from the generator.
 *
 *   pnpm tsx scripts/experiments/retrieval-eval.ts
 *
 * FTS is free; hybrid embeds each query with Voyage (retries on 429, since the
 * free tier without a payment method allows 3 requests/minute).
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { EvalCase } from "../../lib/evals/checks";
import { retrieve, type RetrievalMode } from "../../lib/rag/search";

config({ path: ".env.local", quiet: true });

async function main() {
  const cases: EvalCase[] = readFileSync("evals/dataset.jsonl", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((c: EvalCase) => c.expected_services.length > 0);

  const results: Record<RetrievalMode, unknown[]> = { fts: [], hybrid: [] };
  const summary: Record<string, unknown> = {};
  for (const mode of ["fts", "hybrid"] as RetrievalMode[]) {
    let hits = 0;
    let fallbacks = 0;
    const latencies: number[] = [];
    for (const c of cases) {
      const query = [...c.turns, c.followup ?? ""].join(" ");
      const r = await retrieve(query, { mode, embedRetries: mode === "hybrid" ? 4 : 0 });
      const got = r.documents.map((d) => d.serviceId);
      const hit = c.expected_services.some((s) => got.includes(s));
      if (hit) hits++;
      if (r.modeUsed !== mode) fallbacks++;
      latencies.push(r.latencyMs);
      results[mode].push({
        id: c.id,
        expected: c.expected_services,
        retrieved: got,
        hit,
        modeUsed: r.modeUsed,
      });
      console.log(`${mode.padEnd(6)} ${hit ? "HIT " : "MISS"} ${c.id.padEnd(26)} ${got.join(", ")}`);
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    summary[mode] = {
      recallAt3: Math.round((hits / cases.length) * 1000) / 1000,
      hits,
      cases: cases.length,
      fallbacksToFts: fallbacks,
      latencyP50Ms: sorted[Math.floor(sorted.length / 2)],
    };
  }
  console.log(JSON.stringify(summary, null, 2));
  mkdirSync("docs/evidencia/paso-05", { recursive: true });
  writeFileSync(
    "docs/evidencia/paso-05/retrieval-eval.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        gitSha: execSync("git rev-parse --short HEAD").toString().trim(),
        metric: "¿algún servicio esperado está entre los 3 documentos recuperados?",
        summary,
        results,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
