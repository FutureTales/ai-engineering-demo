/**
 * Send one or more user messages to a running /api/chat and save the full
 * transcript (text + "under the hood" metadata) as evidence.
 *
 *   pnpm tsx scripts/probe-chat.ts --base http://localhost:3000 \
 *     --out docs/evidencia/paso-03/hotel.json "mensaje 1" ["mensaje 2" ...]
 *
 * Each extra message is sent as a follow-up turn in the same conversation.
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Turn {
  user: string;
  assistant: string;
  metadata: Record<string, unknown>;
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${name}`);
  }
  return process.argv.splice(i, 2)[1];
}

async function sendTurn(base: string, id: string, history: unknown[]): Promise<Omit<Turn, "user">> {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, messages: history }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const raw = await res.text();
  let assistant = "";
  let metadata: Record<string, unknown> = {};
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: {")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === "text-delta") assistant += event.delta;
    if (event.type === "error") throw new Error(event.errorText);
    if (event.messageMetadata) metadata = { ...metadata, ...event.messageMetadata };
  }
  return { assistant, metadata };
}

async function main() {
  const base = arg("--base", "http://localhost:3000");
  const out = arg("--out");
  const userMessages = process.argv.slice(2);
  if (userMessages.length === 0) throw new Error("Pass at least one user message");

  const id = randomUUID();
  const history: unknown[] = [];
  const turns: Turn[] = [];
  for (const [i, text] of userMessages.entries()) {
    history.push({ id: `u${i}`, role: "user", parts: [{ type: "text", text }] });
    const { assistant, metadata } = await sendTurn(base, id, history);
    history.push({ id: `a${i}`, role: "assistant", parts: [{ type: "text", text: assistant }] });
    turns.push({ user: text, assistant, metadata });
    console.log(`turn ${i + 1}: ${JSON.stringify(metadata)}`);
  }

  const gitSha = execSync("git rev-parse --short HEAD").toString().trim();
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      { recordedAt: new Date().toISOString(), base, gitSha, conversationId: id, turns },
      null,
      2,
    ) + "\n",
  );
  console.log(`saved ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
