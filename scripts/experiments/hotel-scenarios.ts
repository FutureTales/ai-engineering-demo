/**
 * The hotel "what if" scenarios from the talk, computed by the same
 * deterministic function the agent calls (no LLM involved).
 *
 *   pnpm tsx scripts/experiments/hotel-scenarios.ts
 */
import { writeFileSync } from "node:fs";
import { simulateQueue } from "../../lib/tools/queue";

const scenarios = simulateQueue([
  { scenario_label: "Hoy: 2 recepcionistas", arrival_rate_per_hour: 18, service_time_min: 6, servers: 2 },
  { scenario_label: "3 recepcionistas", arrival_rate_per_hour: 18, service_time_min: 6, servers: 3 },
  { scenario_label: "4 recepcionistas", arrival_rate_per_hour: 18, service_time_min: 6, servers: 4 },
  {
    scenario_label: "Check-in digital (3 min), 2 recepcionistas",
    arrival_rate_per_hour: 18,
    service_time_min: 3,
    servers: 2,
  },
]);
console.table(
  scenarios.map((s) => ({
    escenario: s.scenario_label,
    utilizacion: s.utilization,
    erlangC_espera: s.analytic?.avg_wait_min,
    des_espera: s.simulation.avg_wait_min,
    des_p90: s.simulation.p90_wait_min,
    cola_dia_malo: s.simulation.bad_day_max_queue_len,
  })),
);
writeFileSync(
  "docs/evidencia/paso-06/hotel-simulacion.json",
  JSON.stringify(
    { generatedAt: new Date().toISOString(), source: "lib/tools/queue.ts simulateQueue()", scenarios },
    null,
    2,
  ) + "\n",
);
