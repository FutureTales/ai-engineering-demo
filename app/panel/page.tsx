import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LINE_LABELS, LINES, type Line } from "@/lib/catalog/lines";
import { createClient, getStaffEmail } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export const metadata = { title: "Panel — Innova Copilot" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "Nueva",
  in_review: "En revisión",
  proposal_sent: "Propuesta enviada",
  closed: "Cerrada",
};

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function PanelPage({ searchParams }: PageProps<"/panel">) {
  const staff = await getStaffEmail();
  if (!staff) redirect("/panel/login");
  const params = await searchParams;
  const line =
    typeof params.line === "string" && (LINES as readonly string[]).includes(params.line)
      ? params.line
      : null;
  const status = typeof params.status === "string" && params.status in STATUS_LABELS ? params.status : null;

  // User-scoped client: every query below goes through RLS (private.is_staff()).
  const db = await createClient();
  let q = db
    .from("requests")
    .select("id, company, contact_name, line, status, recommended_services, created_at, is_demo_seed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (line) q = q.eq("line", line);
  if (status) q = q.eq("status", status);
  const [{ data: requests }, { data: allRequests }, { data: convs }, { data: turns }] = await Promise.all([
    q,
    db.from("requests").select("line, is_demo_seed"),
    db.from("conversations").select("id, has_proposal").eq("is_synthetic", false),
    db.from("interactions").select("conversation_id").eq("is_synthetic", false).eq("mode", "live"),
  ]);

  const byLine = LINES.map((l) => ({ l, n: (allRequests ?? []).filter((r) => r.line === l).length }));
  const convCount = convs?.length ?? 0;
  const withProposal = (convs ?? []).filter((c) => c.has_proposal).length;
  const turnsPerConv = new Map<string, number>();
  for (const t of turns ?? [])
    if (t.conversation_id)
      turnsPerConv.set(t.conversation_id, (turnsPerConv.get(t.conversation_id) ?? 0) + 1);
  const avgTurns = turnsPerConv.size
    ? [...turnsPerConv.values()].reduce((a, b) => a + b, 0) / turnsPerConv.size
    : null;

  const filterLink = (next: { line?: string | null; status?: string | null }) => {
    const sp = new URLSearchParams();
    const l = next.line === undefined ? line : next.line;
    const s = next.status === undefined ? status : next.status;
    if (l) sp.set("line", l);
    if (s) sp.set("status", s);
    return `/panel${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panel del centro</h1>
          <p className="text-muted-foreground text-sm">{staff}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/panel/salud" className="text-sm underline underline-offset-2">
            Salud del asistente
          </Link>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Kpi
          title="Solicitudes por línea"
          value={byLine.map((b) => b.n).join(" · ")}
          hint={byLine.map((b) => LINE_LABELS[b.l].split(" ")[0]).join(" · ") + " (incluye 6 de demo)"}
        />
        <Kpi
          title="Conversaciones con pre-propuesta"
          value={convCount ? `${Math.round((100 * withProposal) / convCount)} %` : "—"}
          hint={`${withProposal} de ${convCount} conversaciones reales`}
        />
        <Kpi
          title="Turnos por conversación"
          value={avgTurns ? avgTurns.toFixed(1) : "—"}
          hint="Promedio de respuestas del copiloto por conversación"
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Línea:</span>
          <Link href={filterLink({ line: null })}>
            <Badge variant={line ? "outline" : "default"}>Todas</Badge>
          </Link>
          {LINES.map((l) => (
            <Link key={l} href={filterLink({ line: l })}>
              <Badge variant={line === l ? "default" : "outline"}>{LINE_LABELS[l]}</Badge>
            </Link>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Estado:</span>
          <Link href={filterLink({ status: null })}>
            <Badge variant={status ? "outline" : "default"}>Todos</Badge>
          </Link>
          {Object.entries(STATUS_LABELS).map(([s, label]) => (
            <Link key={s} href={filterLink({ status: s })}>
              <Badge variant={status === s ? "default" : "outline"}>{label}</Badge>
            </Link>
          ))}
        </div>

        <ul className="mt-4 divide-y rounded-lg border">
          {(requests ?? []).map((r) => (
            <li key={r.id}>
              <Link
                href={`/panel/solicitudes/${r.id}`}
                className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="font-medium">
                    {r.company}{" "}
                    {r.is_demo_seed && <span className="text-muted-foreground text-xs">(demo)</span>}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {r.contact_name} · {LINE_LABELS[r.line as Line]} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <Badge variant="secondary">{STATUS_LABELS[r.status] ?? r.status}</Badge>
              </Link>
            </li>
          ))}
          {(requests ?? []).length === 0 && (
            <li className="text-muted-foreground p-3 text-sm">No hay solicitudes con esos filtros.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
