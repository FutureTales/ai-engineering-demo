import Link from "next/link";

export default function CopilotPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">El copiloto llega en el paso 03</h1>
      <p className="text-muted-foreground mt-3">
        En este punto del proyecto (paso 02) solo existen la arquitectura, la base de datos y el despliegue.
        Revisa <code>git checkout paso-03-primer-llm</code>.
      </p>
      <Link href="/" className="mt-6 inline-block underline underline-offset-2">
        Volver al inicio
      </Link>
    </main>
  );
}
