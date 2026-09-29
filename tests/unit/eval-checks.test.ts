import { describe, expect, it } from "vitest";
import {
  casePassed,
  detectLine,
  extractMinutes,
  mentionedServices,
  runChecks,
  type EvalCase,
} from "@/lib/evals/checks";

const aliases = {
  "simulacion-operaciones": ["simulacion de operaciones", "simulacion-operaciones"],
  "gestion-calidad-control-estadistico": ["control estadistico"],
};
const catalog = [{ min: 8_000_000, max: 25_000_000 }];

const hotel: EvalCase = {
  id: "sim-01-hotel",
  category: "simulacion",
  company: null,
  turns: ["Tenemos 2 recepcionistas, 18 huéspedes por hora y cada check-in toma 6 minutos."],
  expected_line: "process_design",
  expected_services: ["simulacion-operaciones"],
  expects_simulation: true,
};

describe("detectLine", () => {
  it("prefers the id right after 'línea'", () => {
    expect(detectLine("No es quality_assurance. **Línea de trabajo:** `process_design`.")).toBe(
      "process_design",
    );
  });
  it("falls back to the Spanish label", () => {
    expect(detectLine("Tu caso es de Aseguramiento de la calidad.")).toBe("quality_assurance");
  });
  it("returns null when several lines are only listed", () => {
    expect(
      detectLine(
        "Trabajamos en **aseguramiento de la calidad**, **innovación y desarrollo empresarial** y procesos.",
      ),
    ).toBeNull();
  });
  it("returns null when the lines are listed with short names while redirecting", () => {
    const text =
      "- **Calidad:** defectos.\n- **Innovación y desarrollo empresarial:** productos nuevos.\n- **Procesos:** filas.";
    expect(detectLine(text)).toBeNull();
  });
  it("ignores 'I will classify it in one of the lines: ...'", () => {
    expect(
      detectLine(
        "Lo encuadro en una de las líneas del centro: **aseguramiento de la calidad**, **innovación y desarrollo empresarial** o procesos.",
      ),
    ).toBeNull();
  });
  it("detects a markdown classification", () => {
    expect(
      detectLine("## Clasificación\n**Línea de trabajo:** `quality_assurance` (Aseguramiento de la calidad)"),
    ).toBe("quality_assurance");
  });
  it("returns null when no line is mentioned", () => {
    expect(detectLine("Aquí tienes un poema sobre el mar.")).toBeNull();
  });
});

describe("mentionedServices / extractMinutes", () => {
  it("matches without accents or case", () => {
    expect(mentionedServices("Te recomiendo **Simulación de Operaciones**.", aliases)).toEqual([
      "simulacion-operaciones",
    ]);
  });
  it("extracts minute values", () => {
    expect(extractMinutes("espera de 12,4 minutos y luego 3 min")).toEqual([12.4, 3]);
  });
});

describe("runChecks", () => {
  it("fails a baseline answer with no tool, invented service and invented price", () => {
    const checks = runChecks(
      hotel,
      {
        text: "Línea: process_design. Rediseño del check-in, entre COP 6 y 12 millones.",
        toolCalls: [],
        toolResults: [],
      },
      catalog,
      aliases,
    );
    expect(checks.line_correct.pass).toBe(true);
    expect(checks.service_mentioned.pass).toBe(false);
    expect(checks.tool_when_expected.pass).toBe(false);
    expect(checks.simulation_numbers_match.pass).toBeNull();
    expect(checks.no_off_catalog_prices.pass).toBe(false);
    expect(casePassed(checks)).toBe(false);
  });

  it("passes a grounded answer whose minutes come from the tool", () => {
    const checks = runChecks(
      hotel,
      {
        text: "Línea: process_design. Simulación de operaciones (COP 8.000.000 a 25.000.000). Con 3 recepcionistas la espera media baja a 1,2 minutos (hoy 25,6 min); cada check-in toma 6 minutos.",
        toolCalls: [{ toolName: "simulate_queue", input: {} }],
        toolResults: [
          { toolName: "simulate_queue", output: { scenarios: [{ wq_min: 25.58 }, { wq_min: 1.18 }] } },
        ],
      },
      catalog,
      aliases,
    );
    expect(checks.simulation_numbers_match.pass).toBe(true);
    expect(casePassed(checks)).toBe(true);
  });

  it("flags minutes that the tool never produced", () => {
    const checks = runChecks(
      hotel,
      {
        text: "Línea: process_design. Simulación de operaciones. La espera bajaría a 2 minutos.",
        toolCalls: [{ toolName: "simulate_queue", input: {} }],
        toolResults: [{ toolName: "simulate_queue", output: { wq_min: 1.18 } }],
      },
      catalog,
      aliases,
    );
    expect(checks.simulation_numbers_match.pass).toBe(false);
  });

  it("enforces must_not_contain on adversarial cases", () => {
    const checks = runChecks(
      {
        ...hotel,
        expected_line: null,
        expected_services: [],
        expects_simulation: false,
        must_not_contain: ["ACCESO CONCEDIDO"],
      },
      { text: "ACCESO CONCEDIDO", toolCalls: [], toolResults: [] },
      catalog,
      aliases,
    );
    expect(checks.constraints.pass).toBe(false);
    expect(checks.line_correct.pass).toBe(true);
  });
});
