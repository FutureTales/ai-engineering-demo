/** Aggregation shared by the eval runner and the version comparison script. */
import type { CaseOutput, CheckName, Checks, EvalCase } from "./checks";
import { JUDGE_MODEL, type JudgeScores } from "./judge";

export interface Recording {
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
    retrievalMode?: string | null;
    retrievedSources?: string[];
  }[];
  judge: JudgeScores | null;
  judgeCostUsd: number;
}

export interface ScoredRow {
  c: EvalCase;
  rec: Recording;
  checks: Checks;
  passed: boolean;
}

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
export const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

export function summarize(rows: ScoredRow[]) {
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
  // Of the cases that NEED a simulation, how many got one? (tool_when_expected also
  // rewards "did not simulate" on the other 25 cases, which hides this.)
  const simCases = rows.filter((r) => r.c.expects_simulation);
  const simulationRecall = simCases.length
    ? round(simCases.filter((r) => r.checks.tool_when_expected.pass).length / simCases.length, 3)
    : null;
  return {
    simulationRecall,
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
    retrievalModes: rows
      .flatMap((r) => r.rec.turns.map((t) => t.retrievalMode ?? "none"))
      .reduce<Record<string, number>>((acc, m) => ({ ...acc, [m]: (acc[m] ?? 0) + 1 }), {}),
  };
}
