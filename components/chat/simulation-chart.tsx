"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QueueScenarioResult } from "@/lib/tools/queue";

/** Splits long scenario names into short lines so the axis labels never overlap. */
function wrap(label: string, max = 16): string[] {
  const words = label
    .replace(/[(),:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= max) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  return lines.slice(0, 3);
}

function WrappedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={10} fill="currentColor">
      {wrap(payload?.value ?? "").map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 12 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** Wait times per scenario, straight from simulate_queue's output (never from the LLM's text). */
export function SimulationChart({ scenarios }: { scenarios: QueueScenarioResult[] }) {
  const data = scenarios.map((s) => ({
    name: s.scenario_label,
    "Espera media (min)": s.simulation.avg_wait_min,
    "Espera p90 (min)": s.simulation.p90_wait_min,
  }));
  return (
    <div className="mt-2 rounded-lg border p-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        Espera en el pico · simulación de {scenarios[0]?.simulation.hours} h,{" "}
        {scenarios[0]?.simulation.replications} réplicas
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={<WrappedTick />} interval={0} height={56} />
            <YAxis tick={{ fontSize: 11 }} unit=" min" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Espera media (min)" fill="#0283BA" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Espera p90 (min)" fill="#1A2850" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="mt-2 w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="text-left">
            <th className="py-1 font-medium">Escenario</th>
            <th className="font-medium">Utilización</th>
            <th className="font-medium">Espera media</th>
            <th className="font-medium">p90</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.scenario_label} className="border-t">
              <td className="py-1 pr-2">{s.scenario_label}</td>
              <td className={s.stable ? "" : "text-destructive font-semibold"}>
                {Math.round(s.utilization * 100)} %{s.stable ? "" : " (inestable)"}
              </td>
              <td>{s.simulation.avg_wait_min} min</td>
              <td>{s.simulation.p90_wait_min} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
