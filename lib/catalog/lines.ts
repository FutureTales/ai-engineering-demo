/** Work lines of the center. No Node.js imports: safe for client components. */
export const LINES = ["quality_assurance", "business_innovation", "process_design"] as const;
export type Line = (typeof LINES)[number];

export const LINE_LABELS: Record<Line, string> = {
  quality_assurance: "Aseguramiento de la calidad",
  business_innovation: "Innovación y desarrollo empresarial",
  process_design: "Diseño, mejora y sostenibilidad de procesos",
};
