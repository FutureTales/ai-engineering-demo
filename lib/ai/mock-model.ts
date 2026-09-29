/**
 * AI_MODE=mock: the demo's plan B (no network, no API keys).
 *
 * A mock language model replays the model output recorded from a real run of
 * the hotel case (data/mocks/hotel.json, made by scripts/record-mocks.ts).
 * Everything else is real: the agent loop, the tool calls, simulate_queue's
 * math, the offline catalog search and the approval step in the UI.
 *
 * Which recorded step to play is chosen by counting the assistant messages in
 * the prompt, so the conversation can be replayed turn by turn.
 */
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import hotel from "@/data/mocks/hotel.json";

type RecordedStep = { chunks: unknown[] };

const steps = (hotel as { steps: RecordedStep[] }).steps;

export const MOCK_MODEL_ID = "mock:claude-sonnet-5-5 (respuestas grabadas)";

export function createMockModel() {
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const assistantTurns = prompt.filter((m) => m.role === "assistant").length;
      const step = steps[Math.min(assistantTurns, steps.length - 1)];
      // JSON turns Dates into strings: restore the response timestamp.
      const chunks = step.chunks.map((c) => {
        const chunk = c as { type: string; timestamp?: string };
        return chunk.type === "response-metadata" && chunk.timestamp
          ? { ...chunk, timestamp: new Date(chunk.timestamp) }
          : c;
      });
      return {
        stream: simulateReadableStream({
          chunks: chunks as never[],
          initialDelayInMs: 400,
          chunkDelayInMs: 12,
        }),
      };
    },
  });
}
