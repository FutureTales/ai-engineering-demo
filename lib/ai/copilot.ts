/**
 * The copilot's model configuration, shared by /api/chat and the evals, so that
 * evals always measure exactly what runs in production.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type ModelMessage } from "ai";
import { estimateCostUsd, MODELS, toUsageBreakdown, type UsageBreakdown } from "./models";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "./prompts";

export const COPILOT_MODEL = MODELS.agent;
export { PROMPT_VERSION };

export function copilotStreamOptions() {
  return {
    model: anthropic(COPILOT_MODEL),
    maxOutputTokens: 4000,
    instructions: {
      role: "system" as const,
      content: SYSTEM_PROMPT,
      // Prompt caching: the system prompt is identical on every request.
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" as const } } },
    },
    providerOptions: { anthropic: { effort: "low" as const } },
  };
}

export interface CopilotRunResult {
  text: string;
  toolCalls: { toolName: string; input: unknown }[];
  toolResults: { toolName: string; output: unknown }[];
  usage: UsageBreakdown;
  costUsd: number;
  latencyMs: number;
  ttftMs: number | null;
}

/** Run one copilot turn to completion (used by evals and scripts). */
export async function runCopilot(messages: ModelMessage[]): Promise<CopilotRunResult> {
  const start = Date.now();
  let ttft: number | null = null;
  const result = streamText({ ...copilotStreamOptions(), messages });
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
    usage,
    costUsd: estimateCostUsd(COPILOT_MODEL, usage),
    latencyMs: Date.now() - start,
    ttftMs: ttft,
  };
}
