/**
 * Offline catalog search for AI_MODE=mock (no database, no keys): a small
 * keyword scorer over the Markdown files. Not as good as the real retrieval,
 * but enough for the demo's plan B.
 */
import { loadServices } from "@/lib/catalog/load";
import { normalize } from "@/lib/evals/checks";
import type { RetrievedDocument } from "./search";

const STOPWORDS = new Set(
  "de la el en y a los las un una que con por para del se su sus es al lo mi tenemos tengo muy mas pero como".split(
    " ",
  ),
);

function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function searchOffline(query: string, { lineFilter = null as string | null, maxDocuments = 3 } = {}) {
  const q = new Set(tokens(query));
  const scored = loadServices()
    .filter((s) => !lineFilter || s.line === lineFilter)
    .map((s) => {
      const docTokens = tokens(s.content);
      const score = docTokens.filter((t) => q.has(t)).length / Math.sqrt(docTokens.length);
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocuments);
  return scored.map(({ s, score }): RetrievedDocument => ({
    sourcePath: s.sourcePath,
    title: s.name,
    kind: "service",
    serviceId: s.id,
    content: s.content,
    score,
  }));
}
