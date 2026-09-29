/**
 * Experiment (paso-03): how prompt caching and the thinking setting change
 * cost and latency for the same message. Results are saved as evidence; the
 * step doc quotes only numbers from the output file.
 *
 *   pnpm tsx scripts/experiments/cache-and-latency.ts [runsPerConfig=3]
 */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { estimateCostUsd, MODELS, toUsageBreakdown } from "../../lib/ai/models";
import { SYSTEM_PROMPT } from "../../lib/ai/prompts";

config({ path: ".env.local", quiet: true });

const MESSAGE =
  "Tengo un hotel boutique de 24 habitaciones en Getsemaní. En temporada alta se forman filas de hasta 40 minutos en el check-in entre las 2 y las 5 p. m. Tenemos 2 recepcionistas, llegan unos 18 huéspedes por hora y cada check-in toma unos 6 minutos. ¿Qué me recomiendan?";

type Thinking = "adaptive" | "between_tools";
interface Config {
  name: string;
  cache: boolean;
  thinking: Thinking;
}

const CONFIGS: Config[] = [
  { name: "sin-cache · thinking adaptativo", cache: false, thinking: "adaptive" },
  { name: "con-cache · thinking adaptativo", cache: true, thinking: "adaptive" },
  { name: "con-cache · thinking between_tools", cache: true, thinking: "between_tools" },
];

async function runOnce(c: Config) {
  const model = MODELS.agent;
  const start = Date.now();
  let ttft: number | null = null;
  const result = streamText({
    model: anthropic(model),
    maxOutputTokens: 4000,
    instructions: {
      role: "system",
      content: SYSTEM_PROMPT,
      providerOptions: c.cache ? { anthropic: { cacheControl: { type: "ephemeral" } } } : undefined,
    },
    prompt: MESSAGE,
    providerOptions: {
      anthropic: {
        effort: "low",
        ...(c.thinking === "between_tools" ? { thinking: { type: "between_tools" } } : {}),
      },
    },
  });
  for await (const part of result.stream) {
    if (part.type === "text-delta" && ttft === null) ttft = Date.now() - start;
  }
  const usage = toUsageBreakdown(await result.totalUsage);
  return { ttftMs: ttft, latencyMs: Date.now() - start, usage, costUsd: estimateCostUsd(model, usage) };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function main() {
  const runs = Number(process.argv[2] ?? 3);
  const results = [];
  for (const c of CONFIGS) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const r = await runOnce(c);
      console.log(`${c.name} #${i + 1}: ${JSON.stringify(r)}`);
      samples.push(r);
    }
    results.push({
      config: c,
      medianTtftMs: median(samples.map((s) => s.ttftMs ?? NaN)),
      medianLatencyMs: median(samples.map((s) => s.latencyMs)),
      medianCostUsd: median(samples.map((s) => s.costUsd)),
      medianOutputTokens: median(samples.map((s) => s.usage.outputTokens)),
      samples,
    });
  }
  const out = "docs/evidencia/paso-03/experimento-cache-latencia.json";
  mkdirSync("docs/evidencia/paso-03", { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        gitSha: execSync("git rev-parse --short HEAD").toString().trim(),
        model: MODELS.agent,
        effort: "low",
        runsPerConfig: runs,
        message: MESSAGE,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`saved ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
