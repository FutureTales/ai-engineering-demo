import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "@/lib/rag/chunking";
import { loadServices } from "@/lib/catalog/load";

describe("chunkMarkdown", () => {
  it("splits by ## sections and prefixes the title", () => {
    const chunks = chunkMarkdown("Doc", "# Doc\n\n> intro\n\n## Uno\nA\n\n## Dos\nB");
    expect(chunks.map((c) => c.heading)).toEqual(["Uno", "Dos"]);
    expect(chunks[0].content).toContain("Doc — Uno");
    expect(chunks[0].content).toContain("> intro");
    expect(chunks[1].content).toBe("Doc — Dos\n\nB");
  });

  it("keeps every service's price section in its own chunk", () => {
    for (const s of loadServices()) {
      const chunks = chunkMarkdown(s.name, s.content);
      expect(
        chunks.some((c) => c.heading === "Inversión" && c.content.includes("COP")),
        s.id,
      ).toBe(true);
    }
  });
});
