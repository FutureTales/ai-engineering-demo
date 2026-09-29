import type { TurnMetadata } from "@/lib/ai/metadata";

const fmtInt = (n: number | undefined) => (n ?? 0).toLocaleString("es-CO");
const fmtMs = (ms: number | undefined) => (ms === undefined ? "—" : `${(ms / 1000).toFixed(2)} s`);
const fmtUsd = (usd: number | undefined) => (usd === undefined ? "—" : `US$ ${usd.toFixed(4)}`);

/** "Bajo el capó": what this turn cost and how long it took, straight from the API usage. */
export function UnderTheHood({ meta }: { meta: TurnMetadata }) {
  const u = meta.usage;
  return (
    <details className="bg-muted/40 text-muted-foreground mt-2 rounded-md border px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium select-none">Bajo el capó</summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <div>
          <dt>Modelo</dt>
          <dd className="text-foreground font-mono">{meta.model ?? "—"}</dd>
        </div>
        <div>
          <dt>Prompt</dt>
          <dd className="text-foreground font-mono">{meta.promptVersion ?? "—"}</dd>
        </div>
        <div>
          <dt>Modo</dt>
          <dd className="text-foreground font-mono">{meta.mode ?? "—"}</dd>
        </div>
        <div>
          <dt>Tokens de entrada</dt>
          <dd className="text-foreground font-mono">{fmtInt(u?.inputTokens)}</dd>
        </div>
        <div>
          <dt>Leídos de caché</dt>
          <dd className="text-foreground font-mono">{fmtInt(u?.cacheReadTokens)}</dd>
        </div>
        <div>
          <dt>Escritos en caché</dt>
          <dd className="text-foreground font-mono">{fmtInt(u?.cacheWriteTokens)}</dd>
        </div>
        <div>
          <dt>Tokens de salida</dt>
          <dd className="text-foreground font-mono">{fmtInt(u?.outputTokens)}</dd>
        </div>
        <div>
          <dt>Costo estimado</dt>
          <dd className="text-foreground font-mono">{fmtUsd(meta.costUsd)}</dd>
        </div>
        <div>
          <dt>Primer token / total</dt>
          <dd className="text-foreground font-mono">
            {fmtMs(meta.ttftMs)} / {fmtMs(meta.latencyMs)}
          </dd>
        </div>
      </dl>
      {meta.retrieval && (
        <div className="mt-2 border-t pt-2">
          <p>
            Recuperación: <span className="text-foreground font-mono">{meta.retrieval.mode}</span>
            {meta.retrieval.fallbackReason && ` (respaldo: ${meta.retrieval.fallbackReason})`} ·{" "}
            {fmtMs(meta.retrieval.latencyMs)}
          </p>
          <ul className="mt-1 list-disc pl-4">
            {meta.retrieval.sources.map((s) => (
              <li key={s.sourcePath} className="text-foreground font-mono">
                {s.sourcePath}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
