// Personal details shown on the site. Fill these in before sharing the site;
// anything left empty is simply not shown.
export const siteConfig = {
  // Full profile URL, e.g. "https://www.instagram.com/yourhandle/".
  instagramUrl: "https://www.instagram.com/cookingwithtrevor1/",
  // Where people can reach you about privacy or account questions.
  contactEmail: "cookingwithtrevor.noreply@gmail.com",
};

// "@yourhandle" from the profile URL, for link text.
export function instagramHandle(url: string = siteConfig.instagramUrl): string | null {
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/);
  return match ? `@${match[1]}` : null;
}
