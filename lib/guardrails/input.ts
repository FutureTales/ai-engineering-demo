/**
 * Validation of the chat request body. The whole history comes from the client,
 * so EVERY message is bounded, not just the last one (code review, paso-08).
 */
export const MAX_MESSAGES = 40;
export const MAX_USER_CHARS = 2000;
export const MAX_ASSISTANT_TEXT_CHARS = 12_000;
/** Upper bound for the serialized history (~40k tokens), including tool parts. */
export const MAX_BODY_CHARS = 150_000;

const ALLOWED_PART_TYPES = new Set([
  "text",
  "step-start",
  "reasoning",
  "tool-search_services",
  "tool-simulate_queue",
  "tool-create_request",
]);

type Part = { type?: unknown; text?: unknown };
type Message = { role?: unknown; parts?: unknown };

export type InputError = { status: 400 | 413; error: string };

export function validateChatMessages(messages: unknown[]): InputError | null {
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { status: 400, error: "Solicitud inválida." };
  }
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
    return { status: 413, error: "La conversación es demasiado larga. Empieza una nueva." };
  }
  for (const raw of messages as Message[]) {
    if (raw.role !== "user" && raw.role !== "assistant") return { status: 400, error: "Solicitud inválida." };
    if (!Array.isArray(raw.parts)) return { status: 400, error: "Solicitud inválida." };
    for (const p of raw.parts as Part[]) {
      if (typeof p?.type !== "string" || !ALLOWED_PART_TYPES.has(p.type)) {
        return { status: 400, error: "Solicitud inválida." };
      }
      if (p.type === "text") {
        const len = typeof p.text === "string" ? p.text.length : 0;
        if (raw.role === "user" && len > MAX_USER_CHARS) {
          return {
            status: 413,
            error: `El mensaje es demasiado largo (máximo ${MAX_USER_CHARS} caracteres).`,
          };
        }
        if (raw.role === "assistant" && len > MAX_ASSISTANT_TEXT_CHARS) {
          return { status: 400, error: "Solicitud inválida." };
        }
      }
      // Only the user sends text as a user; tool parts only belong to assistant messages.
      if (raw.role === "user" && p.type !== "text") return { status: 400, error: "Solicitud inválida." };
    }
  }
  return null;
}
