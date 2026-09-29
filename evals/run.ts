/**
 * Innova Copilot eval runner.
 *
 *   pnpm eval --label paso-03-primer-llm         live: calls the copilot + the judge (costs tokens)
 *   pnpm eval --mock                             replays recorded outputs (free; used in CI)
 *
 * Options:
 *   --label <name>      version label for results/recordings (default: latest paso-* tag + prompt version)
 *   --limit <n>         run only the first n cases
 *   --only <id,id>      run only these case ids
 *   --concurrency <n>   parallel cases in live mode (default 4)
 *   --no-judge          skip the LLM judge
 *   --no-db             do not write eval_runs / eval_results
 *   --human-sample <n>  rows exported to evals/human-review.csv (default 8)
 *
 * Every live run records each case to evals/recordings/<label>/<id>.json and
 * writes evals/recordings/LATEST, so `--mock` can replay it deterministically.
 */
import type { ModelMessage } from "ai";
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { COPILOT_MODEL, PROMPT_VERSION, runCopilot } from "../lib/ai/copilot";
import { loadServices } from "../lib/catalog/load";
import {
  casePassed,
  detectLine,
  runChecks,
  type CaseOutput,
  type CheckName,
  type Checks,
  type EvalCase,
} from "../lib/evals/checks";
import { judge, JUDGE_MODEL, type JudgeScores } from "../lib/evals/judge";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: ".env.local", quiet: true });

const ROOT = process.cwd();
const EVALS = path.join(ROOT, "evals");
const RECORDINGS = path.join(EVALS, "recordings");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const opt = (name: string, fallback?: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const MOCK = flag("--mock");
const USE_JUDGE = !flag("--no-judge");
const CONCURRENCY = Number(opt("--concurrency", "4"));
const HUMAN_SAMPLE = Number(opt("--human-sample", "8"));

function git(cmd: string): string | null {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function defaultLabel(): string {
  if (MOCK && existsSync(path.join(RECORDINGS, "LATEST"))) {
    return readFileSync(path.join(RECORDINGS, "LATEST"), "utf8").trim();
  }
  const tag = git("describe --tags --match 'paso-*' --abbrev=0") ?? "sin-tag";
  return `${tag}__${PROMPT_VERSION}`;
}
const LABEL = opt("--label", defaultLabel())!;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
let dataset: EvalCase[] = readFileSync(path.join(EVALS, "dataset.jsonl"), "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
const only = opt("--only");
if (only) dataset = dataset.filter((c) => only.split(",").includes(c.id));
const limit = opt("--limit");
if (limit) dataset = dataset.slice(0, Number(limit));

const aliases: Record<string, string[]> = JSON.parse(
  readFileSync(path.join(EVALS, "service-aliases.json"), "utf8"),
);
const catalog = loadServices().map((s) => ({ min: s.priceMinCop, max: s.priceMaxCop }));

// ---------------------------------------------------------------------------
// One case
// ---------------------------------------------------------------------------
interface Recording {
  caseId: string;
  label: string;
  recordedAt: string;
  model: string;
  promptVersion: string;
  turns: {
    user: string;
    assistant: string;
    toolCalls: CaseOutput["toolCalls"];
    toolResults: CaseOutput["toolResults"];
    costUsd: number;
    latencyMs: number;
    ttftMs: number | null;
  }[];
  judge: JudgeScores | null;
  judgeCostUsd: number;
}

async function runLive(c: EvalCase): Promise<Recording> {
  const messages: ModelMessage[] = [];
  const turns: Recording["turns"] = [];
  const userTurns = [...c.turns];

  for (let i = 0; i < userTurns.length; i++) {
    messages.push({ role: "user", content: userTurns[i] });
    const r = await runCopilot(messages);
    messages.push({ role: "assistant", content: r.text });
    turns.push({
      user: userTurns[i],
      assistant: r.text,
      toolCalls: r.toolCalls,
      toolResults: r.toolResults,
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      ttftMs: r.ttftMs,
    });
    // If the copilot asked clarifying questions instead of classifying, answer once.
    if (
      i === userTurns.length - 1 &&
      c.followup &&
      userTurns.length === c.turns.length &&
      detectLine(r.text) === null
    ) {
      userTurns.push(c.followup);
    }
  }

  let judgeScores: JudgeScores | null = null;
  let judgeCostUsd = 0;
  if (USE_JUDGE) {
    const j = await judge(c, turns);
    judgeScores = j.scores;
    judgeCostUsd = j.costUsd;
  }
  return {
    caseId: c.id,
    label: LABEL,
    recordedAt: new Date().toISOString(),
    model: COPILOT_MODEL,
    promptVersion: PROMPT_VERSION,
    turns,
    judge: judgeScores,
    judgeCostUsd,
  };
}

function loadRecording(c: EvalCase): Recording {
  const file = path.join(RECORDINGS, LABEL, `${c.id}.json`);
  if (!existsSync(file)) throw new Error(`No recording for ${c.id} under ${LABEL}. Run live first.`);
  return JSON.parse(readFileSync(file, "utf8"));
}

async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

function summarize(rows: { c: EvalCase; rec: Recording; checks: Checks; passed: boolean }[]) {
  const names = Object.keys(rows[0].checks) as CheckName[];
  const checks = Object.fromEntries(
    names.map((n) => {
      const applicable = rows.filter((r) => r.checks[n].pass !== null);
      const passed = applicable.filter((r) => r.checks[n].pass).length;
      return [
        n,
        {
          passed,
          applicable: applicable.length,
          rate: applicable.length ? round(passed / applicable.length, 3) : null,
        },
      ];
    }),
  );
  const judged = rows.filter((r) => r.rec.judge);
  const avg = (k: "pertinencia" | "fundamentacion" | "claridad" | "tono") =>
    judged.length ? round(judged.reduce((s, r) => s + r.rec.judge![k], 0) / judged.length, 2) : null;
  const turnLatencies = rows.flatMap((r) => r.rec.turns.map((t) => t.latencyMs));
  const ttfts = rows.flatMap((r) => r.rec.turns.map((t) => t.ttftMs).filter((x): x is number => x !== null));
  const copilotCost = rows.reduce((s, r) => s + r.rec.turns.reduce((a, t) => a + t.costUsd, 0), 0);
  const judgeCost = rows.reduce((s, r) => s + r.rec.judgeCostUsd, 0);
  const byCategory = Object.fromEntries(
    [...new Set(rows.map((r) => r.c.category))].map((cat) => {
      const rs = rows.filter((r) => r.c.category === cat);
      return [cat, { passed: rs.filter((r) => r.passed).length, total: rs.length }];
    }),
  );
  return {
    casePassRate: round(rows.filter((r) => r.passed).length / rows.length, 3),
    casesPassed: rows.filter((r) => r.passed).length,
    checks,
    byCategory,
    judge: {
      model: JUDGE_MODEL,
      judged: judged.length,
      pertinencia: avg("pertinencia"),
      fundamentacion: avg("fundamentacion"),
      claridad: avg("claridad"),
      tono: avg("tono"),
    },
    costUsd: { copilot: round(copilotCost), judge: round(judgeCost), total: round(copilotCost + judgeCost) },
    costPerCaseUsd: round(copilotCost / rows.length),
    latencyMs: {
      turnP50: percentile(turnLatencies, 50),
      turnP95: percentile(turnLatencies, 95),
      ttftP50: percentile(ttfts, 50),
      ttftP95: percentile(ttfts, 95),
    },
    turns: turnLatencies.length,
  };
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Eval ${MOCK ? "MOCK (recorded outputs)" : "LIVE"} · label ${LABEL} · ${dataset.length} cases`);
  const recDir = path.join(RECORDINGS, LABEL);
  if (!MOCK) mkdirSync(recDir, { recursive: true });

  const rows = await pool(dataset, MOCK ? 1 : CONCURRENCY, async (c, i) => {
    const rec = MOCK ? loadRecording(c) : await runLive(c);
    if (!MOCK) writeFileSync(path.join(recDir, `${c.id}.json`), JSON.stringify(rec, null, 2) + "\n");
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
    const passed = casePassed(checks);
    const failed = Object.entries(checks)
      .filter(([, v]) => v.pass === false)
      .map(([k]) => k);
    console.log(
      `[${String(i + 1).padStart(2)}/${dataset.length}] ${passed ? "PASS" : "FAIL"} ${c.id}${failed.length ? `  ✗ ${failed.join(", ")}` : ""}`,
    );
    return { c, rec, checks, passed };
  });

  if (!MOCK) writeFileSync(path.join(RECORDINGS, "LATEST"), LABEL + "\n");

  const summary = summarize(rows);
  const date = new Date().toISOString().slice(0, 10);
  const gitSha = git("rev-parse --short HEAD");
  const result = {
    label: LABEL,
    mode: MOCK ? "mock" : "live",
    ranAt: new Date().toISOString(),
    gitSha,
    copilotModel: rows[0].rec.model,
    promptVersion: rows[0].rec.promptVersion,
    datasetSize: rows.length,
    summary,
    cases: rows.map(({ c, rec, checks, passed }) => ({
      id: c.id,
      category: c.category,
      passed,
      checks,
      judge: rec.judge,
      turns: rec.turns.length,
      costUsd: round(rec.turns.reduce((a, t) => a + t.costUsd, 0)),
    })),
  };

  mkdirSync(path.join(EVALS, "results"), { recursive: true });
  const outFile = path.join(EVALS, "results", `${date}-${LABEL}${MOCK ? "-mock" : ""}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");

  // Human-in-the-loop sample: every k-th case, so the sample spans categories.
  if (!MOCK && HUMAN_SAMPLE > 0) {
    const step = Math.max(1, Math.floor(rows.length / HUMAN_SAMPLE));
    const sample = rows.filter((_, i) => i % step === 0).slice(0, HUMAN_SAMPLE);
    const header = [
      "label",
      "case_id",
      "category",
      "user",
      "copilot",
      "auto_passed",
      "judge_pertinencia",
      "judge_fundamentacion",
      "judge_claridad",
      "judge_tono",
      "judge_justificacion",
      "human_pertinencia",
      "human_fundamentacion",
      "human_claridad",
      "human_tono",
      "human_notes",
    ];
    const lines = sample.map(({ c, rec, passed }) =>
      [
        LABEL,
        c.id,
        c.category,
        rec.turns.map((t) => t.user).join(" / "),
        rec.turns.map((t) => t.assistant).join("\n---\n"),
        passed,
        rec.judge?.pertinencia,
        rec.judge?.fundamentacion,
        rec.judge?.claridad,
        rec.judge?.tono,
        rec.judge?.justificacion,
        "",
        "",
        "",
        "",
        "",
      ]
        .map(csvCell)
        .join(","),
    );
    writeFileSync(path.join(EVALS, "human-review.csv"), [header.join(","), ...lines].join("\n") + "\n");
  }

  // Persist to Supabase (live runs with a service key only).
  if (!MOCK && !flag("--no-db") && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createAdminClient();
    const { data: run, error } = await db
      .from("eval_runs")
      .insert({
        version: LABEL,
        git_sha: gitSha,
        mode: "live",
        dataset_size: rows.length,
        summary,
        cost_usd: summary.costUsd.total,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: resErr } = await db.from("eval_results").insert(
      rows.map(({ c, rec, checks, passed }) => ({
        run_id: run.id,
        case_id: c.id,
        passed,
        checks,
        judge: rec.judge,
        output: rec.turns.map((t) => t.assistant).join("\n\n---\n\n"),
        tool_calls: rec.turns.flatMap((t) => t.toolCalls),
        latency_ms: rec.turns.reduce((a, t) => a + t.latencyMs, 0),
        cost_usd: round(
          rec.turns.reduce((a, t) => a + t.costUsd, 0),
          6,
        ),
      })),
    );
    if (resErr) throw resErr;
    console.log(`Saved to Supabase eval_runs (${run.id})`);
  }

  console.log("\n=== Resumen ===");
  console.log(
    `Casos que pasan todo: ${summary.casesPassed}/${rows.length} (${(summary.casePassRate * 100).toFixed(1)} %)`,
  );
  for (const [k, v] of Object.entries(summary.checks)) {
    console.log(
      `  ${k.padEnd(26)} ${v.rate === null ? "n/a" : `${(v.rate * 100).toFixed(1)} %`}  (${v.passed}/${v.applicable})`,
    );
  }
  console.log(
    `Juez (${summary.judge.judged} casos): pertinencia ${summary.judge.pertinencia} · fundamentación ${summary.judge.fundamentacion} · claridad ${summary.judge.claridad} · tono ${summary.judge.tono}`,
  );
  console.log(
    `Costo: copiloto US$ ${summary.costUsd.copilot} · juez US$ ${summary.costUsd.judge} · total US$ ${summary.costUsd.total}`,
  );
  console.log(
    `Latencia por turno p50/p95: ${summary.latencyMs.turnP50} / ${summary.latencyMs.turnP95} ms · primer token p50/p95: ${summary.latencyMs.ttftP50} / ${summary.latencyMs.ttftP95} ms`,
  );
  console.log(`Resultados: ${path.relative(ROOT, outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export type { Recording };
