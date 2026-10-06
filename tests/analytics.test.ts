import { describe, expect, it } from "vitest";
import { analyticsUrl } from "@/lib/analytics";

describe("what analytics may report", () => {
  it("keeps public pages, without query strings", () => {
    expect(analyticsUrl("https://site.test/recipes/pie?utm_source=ig")).toBe("https://site.test/recipes/pie");
    expect(analyticsUrl("https://site.test/search?q=my+private+search")).toBe("https://site.test/search");
  });

  it("drops private pages and sign-in links entirely", () => {
    for (const path of ["/library", "/library/abc", "/grocery/x", "/account", "/admin/moderation", "/auth/confirm?token_hash=secret", "/login?next=/x", "/mfa"]) {
      expect(analyticsUrl(`https://site.test${path}`)).toBeNull();
    }
    expect(analyticsUrl("https://site.test/libraryish")).toBe("https://site.test/libraryish");
    expect(analyticsUrl("not a url")).toBeNull();
  });
});
