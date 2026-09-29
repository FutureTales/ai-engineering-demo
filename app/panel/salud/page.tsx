import Link from "next/link";
import { redirect } from "next/navigation";
import { DriftChart } from "@/components/panel/drift-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LINE_LABELS, LINES } from "@/lib/catalog/lines";
import { DRIFT_ALERT_TVD, getHealthReport } from "@/lib/telemetry/health";
import { createClient, getStaffEmail } from "@/lib/supabase/server";

export const metadata = { title: "Salud del asistente — Innova Copilot" };
export const dynamic = "force-dynamic";

const ms = (v: number | null) => (v === null ? "—" : `${(v / 1000).toFixed(1)} s`);
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);
const usd = (v: number | null, d = 4) => (v === null ? "—" : `US$ ${v.toFixed(d)}`);

function Stat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function HealthPage() {
  if (!(await getStaffEmail())) redirect("/panel/login");
  const h = await getHealthReport(await createClient());
  const driftData = LINES.map((l) => ({
    line: LINE_LABELS[l].split(" ")[0],
    baseline: Math.round(h.drift.baseline[l] * 100),
    current: Math.round(h.drift.current[l] * 100),
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/panel" className="text-sm underline underline-offset-2">
        ← Volver al panel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Salud del asistente</h1>
      <p className="text-muted-foreground text-sm">
        Tráfico real en producción y pruebas en vivo (sin tráfico simulado): {h.turns} respuestas en{" "}
        {h.conversations} conversaciones.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat
          title="Costo por conversación"
          value={usd(h.costPerConversationUsd)}
          hint={`Total: ${usd(h.totalCostUsd, 2)}`}
        />
        <Stat
          title="Latencia por respuesta"
          value={`${ms(h.latencyP50Ms)} / ${ms(h.latencyP95Ms)}`}
          hint="p50 / p95"
        />
        <Stat title="Primer token" value={`${ms(h.ttftP50Ms)} / ${ms(h.ttftP95Ms)}`} hint="p50 / p95" />
        <Stat title="Errores" value={pct(h.errorRate)} hint="Respuestas con error" />
      </section>
      <section className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat
          title="Uso de herramientas"
          value={pct(h.toolUseRate)}
          hint={
            Object.entries(h.toolCounts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ") || "sin llamadas"
          }
        />
        <Stat
          title="Modelos"
          value={Object.keys(h.byModel).length.toString()}
          hint={Object.entries(h.byModel)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Evals por versión</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="py-1">Versión</th>
              <th>Fecha</th>
              <th>Casos que pasan todo</th>
              <th>Sin precios inventados</th>
              <th>Costo de la corrida</th>
            </tr>
          </thead>
          <tbody>
            {h.evals.map((e) => (
              <tr key={e.version + e.createdAt} className="border-t">
                <td className="py-1 font-mono text-xs">{e.version}</td>
                <td>
                  {new Date(e.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td>{pct(e.casePassRate)}</td>
                <td>{pct(e.noInventedPrices)}</td>
                <td>{usd(e.costUsd, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Drift: mezcla de solicitudes por línea</h2>
          {h.drift.tvd !== null && (
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${h.drift.alert ? "bg-destructive/10 text-destructive" : "bg-muted"}`}
            >
              {h.drift.alert ? "⚠ Alerta de drift" : "Sin drift"} · TVD {h.drift.tvd.toFixed(2)} (umbral{" "}
              {DRIFT_ALERT_TVD})
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          <strong>Tráfico simulado</strong> (scripts/simulate-traffic.ts): semana base con {h.drift.baselineN}{" "}
          conversaciones y semana actual con {h.drift.currentN}, con una avalancha de solicitudes de propiedad
          intelectual.
        </p>
        {h.drift.tvd === null ? (
          <p className="text-muted-foreground mt-4 text-sm">
            Sin datos. Corre `pnpm tsx scripts/simulate-traffic.ts`.
          </p>
        ) : (
          <div className="mt-3">
            <DriftChart data={driftData} />
          </div>
        )}
      </section>
    </main>
  );
}
