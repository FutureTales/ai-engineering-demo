/**
 * Snapshot of /panel/salud as JSON (for the slides and the docs), so every
 * number shown in the talk traces back to a file in the repo.
 *   pnpm tsx scripts/export-health.ts [out=presentacion/datos-salud.json]
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase/admin";
import { getHealthReport } from "../lib/telemetry/health";

config({ path: ".env.local", quiet: true });

async function main() {
  const out = process.argv[2] ?? "presentacion/datos-salud.json";
  const report = await getHealthReport(createAdminClient());
  writeFileSync(
    out,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        note: "Tráfico real (is_synthetic=false, mode=live): pruebas de desarrollo + producción. El drift usa tráfico simulado.",
        ...report,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({
    turns: report.turns,
    conversations: report.conversations,
    costPerConversationUsd: report.costPerConversationUsd,
    latencyP50Ms: report.latencyP50Ms,
    latencyP95Ms: report.latencyP95Ms,
    errorRate: report.errorRate,
    toolUseRate: report.toolUseRate,
    tvd: report.drift.tvd,
  });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
