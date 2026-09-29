/**
 * Retrieval for the copilot: hybrid (vector + Spanish FTS, fused with RRF in
 * Postgres) with graceful fallback to FTS only.
 *
 * "Small-to-big": we search over small chunks, but hand the model the FULL
 * documents they belong to (a service sheet is ~400 tokens). That way the model
 * never sees a price without the service it belongs to.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { embed, embeddingsAvailable } from "./embeddings";

export type RetrievalMode = "hybrid" | "fts";

export interface RetrievedDocument {
  sourcePath: string;
  title: string;
  kind: "service" | "policy";
  serviceId: string | null;
  content: string;
  score: number;
}

export interface RetrievalResult {
  requestedMode: RetrievalMode;
  modeUsed: RetrievalMode;
  fallbackReason: string | null;
  documents: RetrievedDocument[];
  latencyMs: number;
}

interface MatchRow {
  document_id: number;
  source_path: string;
  title: string;
  kind: "service" | "policy";
  service_id: string | null;
  score: number;
}

export function configuredRetrievalMode(): RetrievalMode {
  return process.env.RAG_MODE === "fts" ? "fts" : "hybrid";
}

export async function retrieve(
  query: string,
  {
    mode = configuredRetrievalMode(),
    lineFilter = null as string | null,
    maxDocuments = 3,
    kinds = ["service"] as ("service" | "policy")[],
    embedRetries = 0,
  } = {},
): Promise<RetrievalResult> {
  const start = Date.now();
  let modeUsed: RetrievalMode = mode;
  let fallbackReason: string | null = null;
  let queryEmbedding: number[] | null = null;

  if (mode === "hybrid") {
    if (!embeddingsAvailable()) {
      modeUsed = "fts";
      fallbackReason = "sin VOYAGE_API_KEY";
    } else {
      try {
        [queryEmbedding] = await embed([query], "query", { retryOn429: embedRetries });
      } catch (err) {
        modeUsed = "fts";
        fallbackReason = err instanceof Error ? err.message.slice(0, 80) : "error de embeddings";
      }
    }
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("match_chunks", {
    query_text: query,
    query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
    match_count: 12,
    line_filter: lineFilter,
  });
  if (error) throw error;

  // Best score per document, keep the requested kinds, top N documents.
  const bestByDoc = new Map<number, MatchRow>();
  for (const row of (data ?? []) as MatchRow[]) {
    if (!kinds.includes(row.kind)) continue;
    const prev = bestByDoc.get(row.document_id);
    if (!prev || row.score > prev.score) bestByDoc.set(row.document_id, row);
  }
  const top = [...bestByDoc.values()].sort((a, b) => b.score - a.score).slice(0, maxDocuments);

  const { data: docs, error: docError } = await db
    .from("documents")
    .select("id, content")
    .in(
      "id",
      top.map((t) => t.document_id),
    );
  if (docError) throw docError;
  const contentById = new Map((docs ?? []).map((d) => [d.id as number, d.content as string]));

  return {
    requestedMode: mode,
    modeUsed,
    fallbackReason,
    latencyMs: Date.now() - start,
    documents: top.map((t) => ({
      sourcePath: t.source_path,
      title: t.title,
      kind: t.kind,
      serviceId: t.service_id,
      content: contentById.get(t.document_id) ?? "",
      score: t.score,
    })),
  };
}
