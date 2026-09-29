/**
 * Voyage AI embeddings (voyage-3.5-lite, 1024 dims, multilingual).
 * Documents and queries are embedded with different `input_type`s, as Voyage recommends.
 */
export const EMBEDDING_MODEL = "voyage-3.5-lite";
export const EMBEDDING_DIMS = 1024;

/** With an explicit key (a user's own), or the server's VOYAGE_API_KEY (scripts, local dev). */
export function embeddingsAvailable(apiKey?: string): boolean {
  return Boolean(apiKey ?? process.env.VOYAGE_API_KEY);
}

export class EmbeddingRateLimitError extends Error {}

/**
 * @param retryOn429 how many times to wait and retry on HTTP 429. Batch jobs
 *   (ingest) retry; the chat does not wait: it falls back to full-text search.
 */
export async function embed(
  texts: string[],
  inputType: "document" | "query",
  { retryOn429 = 0, waitMs = 25_000, apiKey }: { retryOn429?: number; waitMs?: number; apiKey?: string } = {},
): Promise<number[][]> {
  const key = apiKey ?? process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, input_type: inputType }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 429) {
      if (attempt < retryOn429) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw new EmbeddingRateLimitError(`Voyage 429: ${(await res.text()).slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
