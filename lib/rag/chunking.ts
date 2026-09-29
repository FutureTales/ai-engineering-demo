/**
 * Markdown chunking: one chunk per "## " section, each prefixed with the
 * document title so it still makes sense on its own. The intro (before the
 * first "## ") is merged into the first section.
 */
export interface Chunk {
  index: number;
  heading: string | null;
  content: string;
}

export function chunkMarkdown(title: string, markdown: string): Chunk[] {
  const body = markdown.replace(/^# .*\n/, "").trim();
  const parts = body.split(/\n(?=## )/);
  const sections: { heading: string | null; text: string }[] = [];
  let intro = "";
  for (const part of parts) {
    const m = part.match(/^## (.+)\n?([\s\S]*)$/);
    if (!m) {
      intro += part.trim() + "\n";
      continue;
    }
    sections.push({ heading: m[1].trim(), text: m[2].trim() });
  }
  if (sections.length === 0) return [{ index: 0, heading: null, content: `${title}\n\n${intro.trim()}` }];
  if (intro.trim()) sections[0].text = `${intro.trim()}\n\n${sections[0].text}`;
  return sections.map((s, index) => ({
    index,
    heading: s.heading,
    content: `${title} — ${s.heading}\n\n${s.text}`,
  }));
}
