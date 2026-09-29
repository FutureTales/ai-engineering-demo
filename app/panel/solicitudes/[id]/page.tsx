import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LINE_LABELS, type Line } from "@/lib/catalog/lines";
import { createClient, getStaffEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: PageProps<"/panel/solicitudes/[id]">) {
  if (!(await getStaffEmail())) redirect("/panel/login");
  const { id } = await params;
  const db = await createClient();
  const { data: r } = await db.from("requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const rows: [string, string][] = [
    ["Empresa", r.company],
    ["Contacto", `${r.contact_name}${r.contact_email ? ` · ${r.contact_email}` : ""}`],
    ["Línea", LINE_LABELS[r.line as Line]],
    ["Problema", r.problem_summary],
    ["Servicios recomendados", (r.recommended_services as string[]).join(", ")],
    ["Alcance sugerido", r.scope],
    ["Inversión (catálogo)", r.investment_range_cop],
    ["Creada", new Date(r.created_at).toLocaleString("es-CO")],
  ];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/panel" className="text-sm underline underline-offset-2">
        ← Volver al panel
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{r.company}</h1>
        <Badge variant="secondary">{r.status}</Badge>
        {r.is_demo_seed && <Badge variant="outline">demo</Badge>}
      </div>
      <dl className="mt-6 space-y-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground text-xs">{k}</dt>
            <dd className="whitespace-pre-wrap">{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
