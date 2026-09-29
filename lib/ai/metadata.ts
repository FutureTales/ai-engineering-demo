import type { UIMessage } from "ai";
import type { RetrievalSummary } from "./copilot";
import type { UsageBreakdown } from "./models";

/** Metadata the server attaches to each assistant message ("Bajo el capó" panel). */
export interface TurnMetadata {
  model?: string;
  promptVersion?: string;
  mode?: "live" | "mock";
  retrieval?: RetrievalSummary;
  usage?: UsageBreakdown;
  costUsd?: number;
  ttftMs?: number;
  latencyMs?: number;
}

export type CopilotUIMessage = UIMessage<TurnMetadata>;
