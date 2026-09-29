import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffEmail } from "@/lib/supabase/server";

export default async function HealthPlaceholder() {
  if (!(await getStaffEmail())) redirect("/panel/login");
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Salud del asistente</h1>
      <p className="text-muted-foreground mt-3">
        Llega en el paso 09 (telemetría, costo, latencia p50/p95 y drift).
      </p>
      <Link href="/panel" className="mt-6 inline-block underline underline-offset-2">
        Volver al panel
      </Link>
    </main>
  );
}
