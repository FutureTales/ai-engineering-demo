/**
 * Harder retrieval test (paso-05): paraphrased problems that avoid the catalog's
 * vocabulary. Does vector search help where keyword search cannot?
 *
 *   pnpm tsx scripts/experiments/retrieval-paraphrase.ts
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { retrieve } from "../../lib/rag/search";

config({ path: ".env.local", quiet: true });

const CASES = [
  { q: "la gente se aburre esperando para pagar y se va sin comprar", expected: "simulacion-operaciones" },
  {
    q: "quiero que nadie más pueda usar el nombre de mi emprendimiento",
    expected: "vigilancia-tecnologica-pi",
  },
  {
    q: "necesito plata del gobierno para una idea nueva y no sé escribir la propuesta",
    expected: "formulacion-proyectos-idi",
  },
  {
    q: "botamos comida todos los días porque hacemos de más",
    expected: "produccion-mas-limpia-desperdicios",
  },
  {
    q: "los muchachos nuevos se equivocan manejando las máquinas y es peligroso enseñarles ahí mismo",
    expected: "capacitacion-realidad-virtual",
  },
  {
    q: "no tengo ni idea de cuánto gano ni cuánto vendo cada semana",
    expected: "tablero-indicadores-analitica",
  },
  {
    q: "los clientes nos devuelven la mercancía porque sale mal hecha",
    expected: "gestion-calidad-control-estadistico",
  },
  { q: "quiero ver cómo quedaría el producto en la mano antes de fabricar mil", expected: "prototipado-3d" },
];

async function main() {
  const out: Record<string, { hits: number; rows: unknown[] }> = {};
  for (const mode of ["fts", "hybrid"] as const) {
    let hits = 0;
    const rows = [];
    for (const c of CASES) {
      const r = await retrieve(c.q, { mode, embedRetries: 4 });
      const got = r.documents.map((d) => d.serviceId);
      const hit = got.includes(c.expected);
      if (hit) hits++;
      rows.push({ query: c.q, expected: c.expected, retrieved: got, hit, modeUsed: r.modeUsed });
      console.log(`${mode.padEnd(6)} ${hit ? "HIT " : "MISS"} ${c.expected.padEnd(36)} ${got.join(", ")}`);
    }
    out[mode] = { hits, rows };
  }
  console.log(`FTS ${out.fts.hits}/${CASES.length} · híbrido ${out.hybrid.hits}/${CASES.length}`);
  writeFileSync(
    "docs/evidencia/paso-05/retrieval-parafrasis.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        metric: "servicio esperado en top-3",
        cases: CASES.length,
        result: out,
      },
      null,
      2,
    ) + "\n",
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
