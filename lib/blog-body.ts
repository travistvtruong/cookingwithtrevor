// A tiny, safe text format for blog post bodies (rendered as React elements,
// never as HTML):
//   blank line      -> new paragraph
//   "## Heading"    -> section heading
//   "- item" lines  -> bulleted list

export type BodyBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    };

    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        blocks.push({ type: "heading", text: line.slice(3).trim() });
      } else if (/^[-*•]\s+/.test(line)) {
        flush();
        const item = line.replace(/^[-*•]\s+/, "");
        const last = blocks.at(-1);
        if (last?.type === "list") last.items.push(item);
        else blocks.push({ type: "list", items: [item] });
      } else {
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}

// Plain text for excerpts, search descriptions and structured data.
export function bodyText(body: string) {
  return parseBody(body)
    .map((b) => (b.type === "list" ? b.items.join(". ") : b.text))
    .join(" ");
}
