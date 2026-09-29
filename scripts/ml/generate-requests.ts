/**
 * Generate the SYNTHETIC labeled dataset for paso-07 (ml/data/requests_labeled.csv).
 *
 *   pnpm tsx scripts/ml/generate-requests.ts
 *
 * Claude writes short messages as MIPYME owners from Bolívar would, for a GIVEN
 * work line (so the label comes from the generation request, not from a model's
 * guess). Variety is forced by sector, size, register and length. Messages must
 * not name the line or the service, so the classifier has to infer it.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { LINE_LABELS, LINES, type Line } from "../../lib/catalog/lines";
import { estimateCostUsd, MODELS, toUsageBreakdown } from "../../lib/ai/models";

config({ path: ".env.local", quiet: true });

const PER_LINE = 40;
const BATCH = 10;

const LINE_HINTS: Record<Line, string> = {
  quality_assurance: "defectos, devoluciones, reclamos de calidad, variación entre lotes o turnos, certificaciones (ISO), procedimientos que no se siguen, capacitación en seguridad o en procedimientos",
  business_innovation: "producto nuevo o rediseño, prototipos, proteger marca o invento, patentes, buscar financiación o convocatorias, transformación digital o uso de IA sin saber por dónde empezar",
  process_design: "filas y tiempos de espera, capacidad, cuellos de botella, desperdicio de materia prima o energía, procesos en papel o WhatsApp, inventarios desordenados, falta de indicadores",
};

const REGISTERS = [
  "informal, como un audio de WhatsApp transcrito, con alguna falta de ortografía",
  "formal y ordenado, como un correo",
  "muy corto (una o dos frases)",
  "largo, con contexto del negocio y números aproximados",
  "confuso: la persona no sabe bien qué necesita y mezcla temas, aunque el problema principal es de esta línea",
];

const schema = z.object({
  requests: z.array(z.object({ text: z.string().min(20), sector: z.string() })).length(BATCH),
});

async function main() {
  const rows: { id: string; text: string; line: Line; sector: string; register: string; source: string }[] = [];
  let cost = 0;
  for (const line of LINES) {
    for (let b = 0; b < PER_LINE / BATCH; b++) {
      const register = REGISTERS[(b + LINES.indexOf(line)) % REGISTERS.length];
      const { output, totalUsage } = await generateText({
        model: anthropic(MODELS.agent),
        output: Output.object({ schema }),
        providerOptions: { anthropic: { effort: "low" } },
        prompt: `Escribe ${BATCH} mensajes DISTINTOS que dueños o empleados de MIPYMES del departamento de Bolívar (Colombia) enviarían a un centro de innovación universitario pidiendo ayuda.

Todos los problemas deben corresponder a la línea "${LINE_LABELS[line]}": ${LINE_HINTS[line]}.

Reglas:
- Varía el sector en cada mensaje (turismo, alimentos, confección, logística portuaria, construcción, salud, comercio, agro, pesca, educación, tecnología, artesanías…) y el tamaño (de 2 a 80 empleados).
- Estilo de esta tanda: ${register}.
- NO menciones el nombre de la línea de trabajo ni nombres de servicios; describe el problema con palabras de la persona.
- Datos ficticios. No incluyas datos personales (cédulas, teléfonos, correos).
- Español de Colombia (costeño cuando sea natural).`,
      });
      cost += estimateCostUsd(MODELS.agent, toUsageBreakdown(totalUsage));
      for (const [i, r] of output.requests.entries()) {
        rows.push({
          id: `${line.slice(0, 3)}-${String(b * BATCH + i + 1).padStart(3, "0")}`,
          text: r.text.replace(/\s+/g, " ").trim(),
          line,
          sector: r.sector,
          register,
          source: `sintetico:${MODELS.agent}`,
        });
      }
      console.log(`${line} batch ${b + 1}: ${output.requests.length} rows`);
    }
  }
  const unique = new Map(rows.map((r) => [r.text.toLowerCase(), r]));
  const csvCell = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const header = "id,text,line,sector,register,source";
  const lines = [...unique.values()].map((r) => [r.id, r.text, r.line, r.sector, r.register, r.source].map(csvCell).join(","));
  mkdirSync("ml/data", { recursive: true });
  writeFileSync("ml/data/requests_labeled.csv", [header, ...lines].join("\n") + "\n");
  console.log(`saved ml/data/requests_labeled.csv: ${unique.size} unique rows (${rows.length - unique.size} duplicates removed) · cost US$ ${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
