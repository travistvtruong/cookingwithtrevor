import { describe, expect, it } from "vitest";
import { bodyText, parseBody } from "@/lib/blog-body";

describe("parseBody (blog post format)", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(parseBody("First line\nstill first.\n\nSecond.")).toEqual([
      { type: "paragraph", text: "First line still first." },
      { type: "paragraph", text: "Second." },
    ]);
  });

  it("recognizes ## headings and - / * / • bullet lists", () => {
    expect(parseBody("## Where to eat\n- Tacos\n* Ramen\n• Pho\n\nThat's it.")).toEqual([
      { type: "heading", text: "Where to eat" },
      { type: "list", items: ["Tacos", "Ramen", "Pho"] },
      { type: "paragraph", text: "That's it." },
    ]);
  });

  it("treats HTML as plain text (rendered by React, never as markup)", () => {
    expect(parseBody("<script>alert(1)</script>")).toEqual([
      { type: "paragraph", text: "<script>alert(1)</script>" },
    ]);
  });

  it("handles Windows line endings and empty input", () => {
    expect(parseBody("a\r\n\r\nb")).toHaveLength(2);
    expect(parseBody("   \n\n  ")).toEqual([]);
  });

  it("flattens to plain text for descriptions", () => {
    expect(bodyText("## Intro\nHello.\n\n- one\n- two")).toBe("Intro Hello. one. two");
  });
});
