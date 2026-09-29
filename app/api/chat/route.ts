import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { aiMode, buildCopilotRequest, copilotModelId, COPILOT_MODEL, PROMPT_VERSION } from "@/lib/ai/copilot";
import type { CopilotUIMessage, TurnMetadata } from "@/lib/ai/metadata";
import { estimateCostUsd, toUsageBreakdown } from "@/lib/ai/models";
import { validateChatMessages } from "@/lib/guardrails/input";
import { checkLimits, clientIp, hashIp, registerConversation } from "@/lib/guardrails/rate-limit";
import { logInteraction, type InteractionRecord } from "@/lib/telemetry/log-interaction";

export const maxDuration = 60;

// Shape only; size and part types of EVERY message are checked by validateChatMessages.
const bodySchema = z.object({
  id: z.uuid(),
  messages: z.array(z.custom<CopilotUIMessage>()),
});

const LIMIT_MESSAGES = {
  rate_limit: "Estás enviando mensajes muy rápido. Espera unos minutos e intenta de nuevo.",
  daily_cap:
    "La demo alcanzó el máximo de conversaciones de hoy. Vuelve mañana; mientras tanto, puedes ver el código paso a paso en GitHub.",
};

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const { id: conversationId, messages } = parsed.data;
  const invalid = validateChatMessages(messages);
  if (invalid) return Response.json({ error: invalid.error }, { status: invalid.status });

  const mode = aiMode();
  if (mode === "live") {
    try {
      // "New conversation" is decided by the server (first time this id is seen),
      // never by the client-controlled history length (code review, paso-08).
      const isNewConversation = await registerConversation(conversationId);
      const decision = await checkLimits({
        ipHash: hashIp(clientIp(req)),
        sessionId: conversationId,
        isNewConversation,
      });
      if (!decision.allowed) {
        return Response.json(
          { error: LIMIT_MESSAGES[decision.reason!] },
          { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds ?? 60) } },
        );
      }
    } catch (err) {
      // Fail closed: if the limits cannot be checked, do not spend API credits.
      console.error("[chat] rate limit check failed", err);
      return Response.json({ error: "El servicio no está disponible en este momento." }, { status: 503 });
    }
  }

  const model = copilotModelId(mode);
  const startedAt = Date.now();
  let firstTokenAt: number | null = null;
  const toolsUsed = new Set<string>();

  // Telemetry runs after the response has been streamed, without delaying the user.
  let resolveTelemetry: (r: InteractionRecord) => void = () => {};
  const telemetry = new Promise<InteractionRecord>((resolve) => (resolveTelemetry = resolve));
  if (mode === "live") after(async () => logInteraction(await telemetry));

  const baseRecord = () => ({
    conversationId,
    mode,
    model,
    promptVersion: PROMPT_VERSION,
    latencyMs: Date.now() - startedAt,
    ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
    toolsUsed: [...toolsUsed],
  });

  const result = streamText({
    ...buildCopilotRequest(await convertToModelMessages(messages), { conversationId, mode }),
    onStepFinish: ({ toolCalls }) => toolCalls.forEach((t) => toolsUsed.add(t.toolName)),
    onFinish: ({ totalUsage }) => {
      const usage = toUsageBreakdown(totalUsage);
      resolveTelemetry({
        ...baseRecord(),
        usage,
        costUsd: mode === "live" ? estimateCostUsd(COPILOT_MODEL, usage) : 0,
      });
    },
    onError: ({ error }) => {
      resolveTelemetry({
        ...baseRecord(),
        usage: { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
        costUsd: 0,
        error: String(error),
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      messageMetadata: ({ part }): TurnMetadata | undefined => {
        if (part.type === "start") return { model, promptVersion: PROMPT_VERSION, mode };
        if (part.type === "text-delta" && firstTokenAt === null) firstTokenAt = Date.now();
        if (part.type === "finish") {
          const usage = toUsageBreakdown(part.totalUsage);
          return {
            usage,
            costUsd: mode === "live" ? estimateCostUsd(COPILOT_MODEL, usage) : 0,
            latencyMs: Date.now() - startedAt,
            ttftMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
            toolsUsed: [...toolsUsed],
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
