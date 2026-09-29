/**
 * The copilot's tools. Each one has a zod schema: the same definition validates
 * the model's input and documents the tool for the model.
 *
 * - search_services: retrieval over the catalog (agentic RAG: the model decides when)
 * - simulate_queue:  deterministic queueing math (the LLM never computes waits)
 * - create_request:  saves the pre-proposal; requires the USER's approval in the UI
 */
import { tool } from "ai";
import { z } from "zod";
import { LINES, loadServices } from "@/lib/catalog/load";
import { searchOffline } from "@/lib/rag/offline";
import { retrieve } from "@/lib/rag/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { simulateQueue } from "./queue";

const SERVICES = loadServices();
const SERVICE_IDS = SERVICES.map((s) => s.id) as [string, ...string[]];

export const lineSchema = z.enum(LINES);

/** Hard bounds so one tool call can never pin the server (code review, paso-08). */
export const MAX_CUSTOMERS_PER_SCENARIO = 5000;

export const queueScenarioSchema = z
  .object({
    scenario_label: z
      .string()
      .min(1)
      .max(80)
      .describe('Nombre corto del escenario, p. ej. "Actual: 2 recepcionistas"'),
    arrival_rate_per_hour: z
      .number()
      .positive()
      .max(2000)
      .describe("Llegadas de clientes por hora en el pico"),
    service_time_min: z
      .number()
      .positive()
      .max(480)
      .describe("Minutos promedio que toma atender a un cliente"),
    servers: z.number().int().min(1).max(100).describe("Número de puestos de atención en paralelo"),
    hours: z.number().positive().max(12).optional().describe("Duración del pico en horas (por defecto 3)"),
  })
  .refine((s) => s.arrival_rate_per_hour * (s.hours ?? 3) <= MAX_CUSTOMERS_PER_SCENARIO, {
    message: `Como máximo ${MAX_CUSTOMERS_PER_SCENARIO} clientes por escenario (llegadas por hora × horas)`,
  });

/** Catalog range for a set of services, computed in code, never by the LLM. */
export function catalogInvestmentRange(serviceIds: string[]): string {
  const fmt = (n: number) => n.toLocaleString("es-CO");
  const ranges = SERVICES.filter((s) => serviceIds.includes(s.id)).map(
    (s) => `${s.name}: COP ${fmt(s.priceMinCop)} – ${fmt(s.priceMaxCop)}`,
  );
  return ranges.join(" · ");
}

export interface ToolContext {
  conversationId: string;
  offline: boolean;
  embedRetries?: number;
}

export function createTools(ctx: ToolContext) {
  return {
    search_services: tool({
      description:
        "Busca en el catálogo del Centro de Innovación Caribe las fichas de servicio más relacionadas con el problema. Devuelve las fichas completas (descripción, cuándo aplica, entregables, duración, inversión) y su fuente. Úsala SIEMPRE antes de recomendar un servicio o dar un precio.",
      inputSchema: z.object({
        query: z.string().min(3).max(500).describe("El problema de la empresa, en palabras clave"),
        line: lineSchema.optional().describe("Filtrar por línea de trabajo, si ya la sabes"),
      }),
      execute: async ({ query, line }) => {
        const documents = ctx.offline
          ? searchOffline(query, { lineFilter: line ?? null })
          : (await retrieve(query, { lineFilter: line ?? null, embedRetries: ctx.embedRetries ?? 0 }))
              .documents;
        return {
          results: documents.map((d) => ({
            service_id: d.serviceId,
            title: d.title,
            source: d.sourcePath,
            content: d.content,
          })),
        };
      },
    }),

    simulate_queue: tool({
      description:
        "Calcula tiempos de espera y utilización para filas o problemas de capacidad (recepción, cajas, muelles, admisiones). Acepta varios escenarios en una sola llamada: incluye SIEMPRE el escenario actual y las alternativas (más puestos, menor tiempo de servicio). Usa teoría de colas Erlang C (M/M/c) y una simulación de eventos discretos del pico con semilla fija. Los resultados son la ÚNICA fuente válida para cifras de espera.",
      inputSchema: z.object({ scenarios: z.array(queueScenarioSchema).min(1).max(6) }),
      execute: async ({ scenarios }) => ({ scenarios: simulateQueue(scenarios) }),
    }),

    create_request: tool({
      description:
        "Guarda la pre-propuesta para que un coordinador del centro la revise. Úsala SOLO cuando la persona haya dicho explícitamente que quiere guardarla y te haya dado el nombre de la empresa y de la persona de contacto. La interfaz le pedirá confirmar antes de guardar.",
      inputSchema: z.object({
        company: z.string().min(2).max(120),
        contact_name: z.string().min(2).max(120),
        contact_email: z.email().max(200).optional(),
        line: lineSchema,
        problem_summary: z.string().min(10).max(1500),
        recommended_services: z.array(z.enum(SERVICE_IDS)).min(1).max(2),
        scope: z.string().min(10).max(1500),
      }),
      execute: async (input) => {
        // The investment range is taken from the catalog, not from the model.
        const investment_range_cop = catalogInvestmentRange(input.recommended_services);
        if (ctx.offline) {
          return { saved: false, mode: "mock", request_id: "demo-mock", ...input, investment_range_cop };
        }
        const db = createAdminClient();
        const { data, error } = await db
          .from("requests")
          .insert({
            ...input,
            contact_email: input.contact_email ?? null,
            conversation_id: ctx.conversationId,
            investment_range_cop,
          })
          .select("id, created_at")
          .single();
        if (error) throw new Error("No se pudo guardar la solicitud");
        await db
          .from("conversations")
          .update({ has_proposal: true, line: input.line })
          .eq("id", ctx.conversationId);
        return {
          saved: true,
          request_id: data.id,
          created_at: data.created_at,
          ...input,
          investment_range_cop,
        };
      },
    }),
  };
}

export type CopilotTools = ReturnType<typeof createTools>;
