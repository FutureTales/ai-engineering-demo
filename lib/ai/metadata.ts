import type { UIMessage } from "ai";
import type { UsageBreakdown } from "./models";

/** Metadata the server attaches to each assistant message ("Bajo el capó" panel). */
export interface TurnMetadata {
  model?: string;
  promptVersion?: string;
  mode?: "live" | "mock";
  toolsUsed?: string[];
  usage?: UsageBreakdown;
  costUsd?: number;
  ttftMs?: number;
  latencyMs?: number;
}

import type { InferUITools } from "ai";
import type { CopilotTools } from "@/lib/tools";

export type CopilotUIMessage = UIMessage<TurnMetadata, never, InferUITools<CopilotTools>>;
