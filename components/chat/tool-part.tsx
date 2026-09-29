"use client";

import type { ChatAddToolApproveResponseFunction } from "ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LINE_LABELS, type Line } from "@/lib/catalog/lines";
import type { CopilotUIMessage } from "@/lib/ai/metadata";
import { SimulationChart } from "./simulation-chart";

type Part = CopilotUIMessage["parts"][number];

function Status({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 text-muted-foreground my-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs">
      {children}
    </div>
  );
}

export function ToolPart({
  part,
  onApproval,
}: {
  part: Part;
  onApproval: ChatAddToolApproveResponseFunction;
}) {
  if (part.type === "tool-search_services") {
    if (part.state !== "output-available") return <Status>🔎 Buscando en el catálogo…</Status>;
    return (
      <Status>
        🔎 Catálogo consultado:{" "}
        {part.output.results.map((r) => (
          <Badge key={r.source} variant="secondary" className="h-auto whitespace-normal">
            {r.title}
          </Badge>
        ))}
      </Status>
    );
  }

  if (part.type === "tool-simulate_queue") {
    if (part.state === "output-available") return <SimulationChart scenarios={part.output.scenarios} />;
    const n = part.input?.scenarios?.length;
    return <Status>📊 Simulando {n ? `${n} escenarios` : "escenarios"}…</Status>;
  }

  if (part.type === "tool-create_request") {
    const input = part.input;
    if (part.state === "approval-requested" && !part.approval.isAutomatic) {
      return (
        <div className="border-primary/30 my-2 rounded-lg border-2 p-3 text-sm">
          <p className="font-medium">¿Guardamos esta pre-propuesta para que el centro la revise?</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {input?.company} · {input?.contact_name} · {input?.line ? LINE_LABELS[input.line as Line] : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => onApproval({ id: part.approval.id, approved: true })}>
              Sí, guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApproval({ id: part.approval.id, approved: false })}
            >
              No guardar
            </Button>
          </div>
        </div>
      );
    }
    if (part.state === "output-denied") return <Status>No se guardó la pre-propuesta.</Status>;
    if (part.state === "output-available") {
      const out = part.output;
      return (
        <div className="bg-card my-2 rounded-lg border p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Pre-propuesta · {out.company}</p>
            <Badge>{out.saved ? "Guardada" : "Demo (no guardada)"}</Badge>
          </div>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-muted-foreground text-xs">Problema</dt>
              <dd>{out.problem_summary}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Línea de trabajo</dt>
              <dd>{LINE_LABELS[out.line as Line]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Servicios</dt>
              <dd>{out.recommended_services.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Alcance sugerido</dt>
              <dd>{out.scope}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Inversión (según catálogo)</dt>
              <dd>{out.investment_range_cop}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Siguiente paso</dt>
              <dd>Un coordinador del centro revisa la solicitud y te contacta en unos 2 días hábiles.</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">Contacto: {out.contact_name}</p>
        </div>
      );
    }
    return <Status>💾 Preparando la pre-propuesta…</Status>;
  }
  return null;
}
