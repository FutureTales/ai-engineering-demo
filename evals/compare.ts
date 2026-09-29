/**
 * Re-score the recordings of several versions with the CURRENT checks, so the
 * comparison is apples to apples (e.g. a check added in paso-05 is also
 * applied to the paso-03 recordings). Judge scores are reused from recordings.
 *
 *   pnpm eval:compare paso-03-primer-llm paso-05-rag-fts paso-05-rag-hybrid
 *
 * Writes evals/results/comparacion.json (used by the charts and the docs).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadServices } from "../lib/catalog/load";
import { casePassed, runChecks, type CaseOutput, type EvalCase } from "../lib/evals/checks";
import { summarize, type Recording, type ScoredRow } from "../lib/evals/summary";

const EVALS = path.join(process.cwd(), "evals");
const labels = process.argv.slice(2);
if (labels.length === 0) throw new Error("Pass one or more labels");

const dataset: EvalCase[] = readFileSync(path.join(EVALS, "dataset.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const aliases = JSON.parse(readFileSync(path.join(EVALS, "service-aliases.json"), "utf8"));
const catalog = loadServices().map((s) => ({ min: s.priceMinCop, max: s.priceMaxCop }));

const versions = labels.map((label) => {
  const rows: ScoredRow[] = dataset.map((c) => {
    const file = path.join(EVALS, "recordings", label, `${c.id}.json`);
    if (!existsSync(file)) throw new Error(`Missing recording ${label}/${c.id}`);
    const rec: Recording = JSON.parse(readFileSync(file, "utf8"));
    const output: CaseOutput = {
      text: rec.turns.map((t) => t.assistant).join("\n\n"),
      toolCalls: rec.turns.flatMap((t) => t.toolCalls),
      toolResults: rec.turns.flatMap((t) => t.toolResults),
    };
    const checks = runChecks(
      c,
      output,
      catalog,
      aliases,
      rec.judge ? { obeyedInjection: rec.judge.obedecio_instrucciones_indebidas } : null,
    );
    return { c, rec, checks, passed: casePassed(checks) };
  });
  return { label, promptVersion: rows[0].rec.promptVersion, summary: summarize(rows) };
});

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)} %`);
const names = Object.keys(versions[0].summary.checks);
console.log(["métrica", ...labels].join(" | "));
console.log(
  [
    "casos que pasan todo",
    ...versions.map((v) => `${v.summary.casesPassed}/30 (${pct(v.summary.casePassRate)})`),
  ].join(" | "),
);
for (const n of names) {
  console.log(
    [
      n,
      ...versions.map((v) => pct((v.summary.checks as Record<string, { rate: number | null }>)[n].rate)),
    ].join(" | "),
  );
}
for (const k of ["pertinencia", "fundamentacion", "claridad", "tono"] as const) {
  console.log([`juez ${k}`, ...versions.map((v) => String(v.summary.judge[k]))].join(" | "));
}
console.log(["costo por caso (US$)", ...versions.map((v) => String(v.summary.costPerCaseUsd))].join(" | "));
console.log(
  [
    "latencia turno p50/p95 (ms)",
    ...versions.map((v) => `${v.summary.latencyMs.turnP50}/${v.summary.latencyMs.turnP95}`),
  ].join(" | "),
);

writeFileSync(
  path.join(EVALS, "results", "comparacion.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Re-scored with the checks at this commit; judge scores come from each recording.",
      versions,
    },
    null,
    2,
  ) + "\n",
);
console.log("\nSaved evals/results/comparacion.json");
