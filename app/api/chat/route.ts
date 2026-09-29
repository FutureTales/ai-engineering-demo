import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
import { after } from "next/server";
import { z } from "zod";
import type { CopilotUIMessage, TurnMetadata } from "@/lib/ai/metadata";
import { COPILOT_MODEL, copilotStreamOptions, PROMPT_VERSION } from "@/lib/ai/copilot";
import { estimateCostUsd, toUsageBreakdown } from "@/lib/ai/models";
import { logInteraction, type InteractionRecord } from "@/lib/telemetry/log-interaction";

export const maxDuration = 60;

// Basic input limits (full guardrails and rate limiting arrive in paso-06).
const MAX_MESSAGE_CHARS = 2000;
const MAX_MESSAGES = 30;

const bodySchema = z.object({
  id: z.uuid(),
  messages: z.array(z.custom<CopilotUIMessage>()).min(1).max(MAX_MESSAGES),
});

function lastUserText(messages: CopilotUIMessage[]): string {
  const last = messages.findLast((m) => m.role === "user");
  return (last?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const { id: conversationId, messages } = parsed.data;
  if (lastUserText(messages).length > MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: `El mensaje es demasiado largo (máximo ${MAX_MESSAGE_CHARS} caracteres).` },
      { status: 413 },
    );
  }

  const model = COPILOT_MODEL;
  const startedAt = Date.now();
  let firstTokenAt: number | null = null;

  // Telemetry runs after the response has been streamed, without delaying the user.
  let resolveTelemetry: (r: InteractionRecord) => void = () => {};
  const telemetry = new Promise<InteractionRecord>((resolve) => (resolveTelemetry = resolve));
  after(async () => logInteraction(await telemetry));

  const result = streamText({
    ...copilotStreamOptions(),
    messages: await convertToModelMessages(messages),
    onFinish: ({ totalUsage }) => {
      const usage = toUsageBreakdown(totalUsage);
      const latencyMs = Date.now() - startedAt;
      const ttftMs = firstTokenAt ? firstTokenAt - startedAt : null;
      const costUsd = estimateCostUsd(model, usage);
      resolveTelemetry({
        conversationId,
        mode: "live",
        model,
        promptVersion: PROMPT_VERSION,
        usage,
        costUsd,
        latencyMs,
        ttftMs,
      });
    },
    onError: ({ error }) => {
      resolveTelemetry({
        conversationId,
        mode: "live",
        model,
        promptVersion: PROMPT_VERSION,
        usage: { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        ttftMs: null,
        error: String(error),
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      messageMetadata: ({ part }): TurnMetadata | undefined => {
        if (part.type === "start") return { model, promptVersion: PROMPT_VERSION, mode: "live" };
        if (part.type === "text-delta" && firstTokenAt === null) firstTokenAt = Date.now();
        if (part.type === "finish") {
          const usage = toUsageBreakdown(part.totalUsage);
          return {
            usage,
            costUsd: estimateCostUsd(model, usage),
            latencyMs: Date.now() - startedAt,
            ttftMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
          };
        }
        return undefined;
      },
      onError: (error) => {
        console.error("[chat] stream error", error);
        return "El copiloto tuvo un problema al responder. Intenta de nuevo en un momento.";
      },
    }),
  });
}
