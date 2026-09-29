/**
 * The copilot agent, shared by /api/chat and the evals, so that evals always
 * measure exactly what runs in production.
 *
 * paso-06: an agent loop. The model decides when to call search_services,
 * simulate_queue and create_request (the last one needs the user's approval).
 */
import { anthropic } from "@ai-sdk/anthropic";
import { isStepCount, streamText, type ModelMessage } from "ai";
import { createTools } from "@/lib/tools";
import { createMockModel, MOCK_MODEL_ID } from "./mock-model";
import { estimateCostUsd, MODELS, toUsageBreakdown, type UsageBreakdown } from "./models";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "./prompts";

export const COPILOT_MODEL = MODELS.agent;
export { PROMPT_VERSION };

/** Upper bound on agent steps per user turn (each model call or tool round is a step). */
export const MAX_AGENT_STEPS = 6;

export type AiMode = "live" | "mock";
export function aiMode(): AiMode {
  return process.env.AI_MODE === "mock" ? "mock" : "live";
}

export function copilotModelId(mode: AiMode = aiMode()): string {
  return mode === "mock" ? MOCK_MODEL_ID : COPILOT_MODEL;
}

export function buildCopilotRequest(
  messages: ModelMessage[],
  {
    conversationId,
    mode = aiMode(),
    embedRetries = 0,
  }: { conversationId: string; mode?: AiMode; embedRetries?: number },
) {
  const tools = createTools({ conversationId, offline: mode === "mock", embedRetries });
  return {
    model: mode === "mock" ? createMockModel() : anthropic(COPILOT_MODEL),
    maxOutputTokens: 4000,
    instructions: {
      role: "system" as const,
      content: SYSTEM_PROMPT,
      // Prompt caching: rules + policies + service index are identical on every request.
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" as const } } },
    },
    messages,
    tools,
    toolApproval: { create_request: "user-approval" as const },
    // Signs the approval requests the server issues, so a client cannot fabricate
    // an "approved" create_request in the history (code review, paso-08).
    experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET,
    stopWhen: isStepCount(MAX_AGENT_STEPS),
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
  steps: number;
  /** Everything the agent produced this turn (tool calls, tool results, text), to append to the history. */
  responseMessages: ModelMessage[];
}

/** Run one copilot turn to completion (used by evals and scripts). */
export async function runCopilot(
  messages: ModelMessage[],
  { embedRetries = 0, mode = "live" as AiMode } = {},
): Promise<CopilotRunResult> {
  const start = Date.now();
  let ttft: number | null = null;
  const result = streamText(
    buildCopilotRequest(messages, {
      conversationId: "00000000-0000-0000-0000-000000000000",
      mode,
      embedRetries,
    }),
  );
  const toolCalls: CopilotRunResult["toolCalls"] = [];
  const toolResults: CopilotRunResult["toolResults"] = [];
  let text = "";
  let steps = 0;
  for await (const part of result.stream) {
    if (part.type === "text-delta") {
      if (ttft === null) ttft = Date.now() - start;
      text += part.text;
    }
    if (part.type === "finish-step") steps++;
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
    steps,
    responseMessages: await result.responseMessages,
  };
}
