import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { LINES, type Line } from "./lines";

export { LINE_LABELS, LINES, type Line } from "./lines";

export interface CatalogService {
  id: string;
  name: string;
  line: Line;
  priceMinCop: number;
  priceMaxCop: number;
  duration: string;
  summary: string;
  content: string;
  sourcePath: string;
}

export interface CatalogPolicy {
  id: string;
  title: string;
  content: string;
  sourcePath: string;
}

const CATALOG_DIR = path.join(process.cwd(), "data", "catalog");

function readMarkdownDir(subdir: string) {
  const dir = path.join(CATALOG_DIR, subdir);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      return { file, data, content: content.trim(), sourcePath: `data/catalog/${subdir}/${file}` };
    });
}

/** First paragraph under "## Descripción", used as a one-line summary. */
function extractSummary(content: string): string {
  const match = content.match(/## Descripción\s+([\s\S]*?)(\n## |$)/);
  return (match?.[1] ?? "").trim().split("\n\n")[0].replace(/\s+/g, " ");
}

export function loadServices(): CatalogService[] {
  return readMarkdownDir("servicios").map(({ file, data, content, sourcePath }) => {
    if (!LINES.includes(data.line)) {
      throw new Error(`${file}: invalid line "${data.line}"`);
    }
    if (data.id !== file.replace(/\.md$/, "")) {
      throw new Error(`${file}: frontmatter id "${data.id}" must match the file name`);
    }
    return {
      id: data.id,
      name: data.name,
      line: data.line,
      priceMinCop: Number(data.price_min_cop),
      priceMaxCop: Number(data.price_max_cop),
      duration: data.duration,
      summary: extractSummary(content),
      content,
      sourcePath,
    };
  });
}

export function loadPolicies(): CatalogPolicy[] {
  return readMarkdownDir("politicas").map(({ data, content, sourcePath }) => ({
    id: data.id,
    title: data.title,
    content,
    sourcePath,
  }));
}
