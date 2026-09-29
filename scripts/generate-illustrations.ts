/**
 * Generate the CONCEPTUAL illustrations of the docs and slides with Gemini.
 *
 *   pnpm tsx scripts/generate-illustrations.ts            -> all prompts in docs/img/prompts/
 *   pnpm tsx scripts/generate-illustrations.ts personas   -> only personas.md
 *
 * Rules of the project (see docs/ilustraciones-con-ia.md):
 * - Only conceptual illustrations. NEVER charts, data, screenshots or anything
 *   that could be mistaken for a real measurement.
 * - Every image is labeled "Ilustración generada con IA" where it is used.
 * - Prompts are versioned in docs/img/prompts/*.md so anyone can reproduce or change them.
 *
 * Requires GEMINI_API_KEY in .env.local.
 */
import { config } from "dotenv";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

config({ path: ".env.local", quiet: true });

const MODEL = "gemini-3.1-flash-image"; // verified in the model list and the image-generation docs on 2026-09-29
const PROMPTS = "docs/img/prompts";
const OUT = "docs/img/ilustraciones";

interface InteractionResponse {
  status?: string;
  error?: { message: string };
  steps?: { type: string; content?: { type: string; mime_type?: string; data?: string }[] }[];
  usage?: { total_input_tokens?: number; total_output_tokens?: number };
}

async function generate(prompt: string, aspectRatio: string, imageSize: string) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: "text", text: prompt }],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: aspectRatio,
        image_size: imageSize,
      },
    }),
  });
  const json = (await res.json()) as InteractionResponse;
  if (!res.ok || json.error)
    throw new Error(`Gemini ${res.status}: ${json.error?.message ?? "unknown error"}`);
  // The image is a content part of type "image" inside a "model_output" step.
  const image = json.steps?.flatMap((s) => s.content ?? []).find((c) => c.type === "image" && c.data);
  if (!image?.data) throw new Error("No image in the response");
  return { bytes: Buffer.from(image.data, "base64"), usage: json.usage };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const only = process.argv[2];
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(PROMPTS).filter((f) => f.endsWith(".md") && (!only || f === `${only}.md`));
  const log: Record<string, unknown>[] = [];
  for (const f of files) {
    const { data, content } = matter(readFileSync(path.join(PROMPTS, f), "utf8"));
    const { bytes, usage } = await generate(
      content.trim(),
      data.aspect_ratio ?? "16:9",
      data.image_size ?? "2K",
    );
    writeFileSync(path.join(OUT, data.output), bytes);
    log.push({
      prompt: `${PROMPTS}/${f}`,
      output: `${OUT}/${data.output}`,
      model: MODEL,
      bytes: bytes.length,
      usage,
      generatedAt: new Date().toISOString(),
    });
    console.log(`✓ ${OUT}/${data.output} (${Math.round(bytes.length / 1024)} KB)`);
  }
  writeFileSync(path.join(OUT, "generacion.json"), JSON.stringify(log, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
