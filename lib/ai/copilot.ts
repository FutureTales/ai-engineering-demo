/**
 * The copilot's model configuration, shared by /api/chat and the evals, so that
 * evals always measure exactly what runs in production.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type ModelMessage } from "ai";
import { retrieve, type RetrievalResult } from "@/lib/rag/search";
import { estimateCostUsd, MODELS, toUsageBreakdown, type UsageBreakdown } from "./models";
import { PROMPT_VERSION, retrievedContext, SYSTEM_PROMPT } from "./prompts";

export const COPILOT_MODEL = MODELS.agent;
export { PROMPT_VERSION };

function messageText(m: ModelMessage): string {
  if (typeof m.content === "string") return m.content;
  return m.content.map((p) => ("text" in p && typeof p.text === "string" ? p.text : "")).join(" ");
}

/** The retrieval query: the last three user messages (follow-ups need earlier context). */
export function retrievalQuery(messages: ModelMessage[]): string {
  return messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map(messageText)
    .join(" ")
    .slice(0, 2000);
}

export interface RetrievalSummary {
  mode: RetrievalResult["modeUsed"];
  fallbackReason: string | null;
  latencyMs: number;
  sources: { title: string; sourcePath: string }[];
}

export async function buildCopilotRequest(messages: ModelMessage[], { embedRetries = 0 } = {}) {
  const retrieval = await retrieve(retrievalQuery(messages), { embedRetries });
  const summary: RetrievalSummary = {
    mode: retrieval.modeUsed,
    fallbackReason: retrieval.fallbackReason,
    latencyMs: retrieval.latencyMs,
    sources: retrieval.documents.map((d) => ({ title: d.title, sourcePath: d.sourcePath })),
  };
  const options = {
    model: anthropic(COPILOT_MODEL),
    maxOutputTokens: 4000,
    instructions: [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
        // Prompt caching: rules + policies + service index are identical on every request.
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" as const } } },
      },
      // Changes per request, so it goes after the cache breakpoint.
      { role: "system" as const, content: retrievedContext(retrieval.documents) },
    ],
    messages,
    providerOptions: { anthropic: { effort: "low" as const } },
  };
  return { options, retrieval: summary };
}

export interface CopilotRunResult {
  text: string;
  toolCalls: { toolName: string; input: unknown }[];
  toolResults: { toolName: string; output: unknown }[];
  retrieval: RetrievalSummary;
  usage: UsageBreakdown;
  costUsd: number;
  latencyMs: number;
  ttftMs: number | null;
}

/** Run one copilot turn to completion (used by evals and scripts). */
export async function runCopilot(
  messages: ModelMessage[],
  { embedRetries = 0 } = {},
): Promise<CopilotRunResult> {
  const start = Date.now();
  let ttft: number | null = null;
  const { options, retrieval } = await buildCopilotRequest(messages, { embedRetries });
  const result = streamText(options);
  const toolCalls: CopilotRunResult["toolCalls"] = [];
  const toolResults: CopilotRunResult["toolResults"] = [];
  let text = "";
  for await (const part of result.stream) {
    if (part.type === "text-delta") {
      if (ttft === null) ttft = Date.now() - start;
      text += part.text;
    }
    if (part.type === "tool-call") toolCalls.push({ toolName: part.toolName, input: part.input });
    if (part.type === "tool-result") toolResults.push({ toolName: part.toolName, output: part.output });
    if (part.type === "error") throw part.error;
  }
  const usage = toUsageBreakdown(await result.totalUsage);
  return {
    text,
    toolCalls,
    toolResults,
    retrieval,
    usage,
    costUsd: estimateCostUsd(COPILOT_MODEL, usage),
    latencyMs: Date.now() - start,
    ttftMs: ttft,
  };
}
