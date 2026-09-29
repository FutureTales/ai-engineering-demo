import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REPO_URL } from "@/components/site-footer";

const FLOW = [
  { title: "Diagnóstico", text: "Cuentas tu problema con tus palabras. El copiloto hace hasta 3 preguntas." },
  { title: "Clasificación", text: "Lo encuadra en una de las 3 líneas de trabajo del centro." },
  { title: "Recomendación", text: "Busca en el catálogo y recomienda 1–2 servicios, citando la fuente." },
  {
    title: "Simulación “what if”",
    text: "Si el problema es de filas o capacidad, una herramienta calcula escenarios. El LLM no calcula.",
  },
  { title: "Pre-propuesta", text: "Con tu autorización, guarda un resumen para el equipo del centro." },
];

const PILLARS = [
  { name: "1 · Construir y desplegar apps de IA", steps: "03 · 04 · 05 · 06 · 07 · 09" },
  { name: "2 · Fundamentos de software", steps: "02 · 06 · 08 · 09" },
  { name: "3 · Uso de agentes de código", steps: "01 · 08 y todas las bitácoras" },
  { name: "4 · Dar forma a lo que se construye", steps: "00 · 07 · 10" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="text-muted-foreground text-sm font-medium">Centro de Innovación Caribe (ficticio)</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Innova Copilot</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Un copiloto de IA que ayuda a una MIPYME a pasar de &ldquo;tengo un problema&rdquo; a una
        pre-propuesta concreta, con números, en una sola conversación.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/copilot" className={buttonVariants({ size: "lg" })}>
          Probar el copiloto
        </Link>
        <a href={REPO_URL} className={buttonVariants({ size: "lg", variant: "outline" })}>
          Ver el código paso a paso
        </a>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Cómo funciona</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {FLOW.map((step, i) => (
          <li key={step.title}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">
                  {i + 1}. {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{step.text}</CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-xl font-semibold">Qué enseña este proyecto</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Acompaña la charla &ldquo;AI Engineering Skills Map&rdquo;, basada en la serie de Andrew Ng en{" "}
        <em>The Batch</em>. Cada paso del proyecto es un tag de git que aplica competencias de los 4 pilares:
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {PILLARS.map((p) => (
          <li key={p.name} className="flex justify-between gap-4 border-b pb-2">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">pasos {p.steps}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
