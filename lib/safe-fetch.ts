import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetch a page from a user-supplied URL without letting the URL reach the
// server's own network (SSRF): http(s) on the default ports only, every
// address the host resolves to must be public, and every redirect is checked
// again. A timeout and a size cap stop slow or huge responses.
// Known gap: DNS could change between the check and the fetch (rebinding);
// on Vercel's serverless functions there's no private network to reach.

export class FetchRefused extends Error {}

const MAX_REDIRECTS = 3;
const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 8000;

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}

function isPublicIpv4(ip: string): boolean {
  const p = ipv4Parts(ip);
  if (!p) return false;
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127) return false; // "this" network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF, documentation
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // documentation
  if (a === 203 && b === 0 && c === 113) return false; // documentation
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

function isPublicIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return false;
  // IPv4 inside IPv6 (::ffff:10.0.0.1, 64:ff9b::10.0.0.1): judge the IPv4 part.
  const embedded = lower.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) return isPublicIpv4(embedded[1]);
  if (/^::ffff:/.test(lower)) return false; // mapped, written in hex: refuse
  if (/^f[cd]/.test(lower)) return false; // unique local
  if (/^fe[89ab]/.test(lower)) return false; // link-local
  if (/^ff/.test(lower)) return false; // multicast
  if (/^2001:db8:/.test(lower)) return false; // documentation
  return true;
}

export function isPublicAddress(ip: string): boolean {
  const version = isIP(ip.replace(/^\[|\]$/g, ""));
  if (version === 4) return isPublicIpv4(ip);
  if (version === 6) return isPublicIpv6(ip);
  return false;
}

// Throws FetchRefused with a message fit to show the user.
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchRefused("That doesn't look like a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchRefused("Use an http or https link.");
  if (url.username || url.password) throw new FetchRefused("Links with a username or password aren't supported.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchRefused("That link uses an unusual port.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".internal")) {
    throw new FetchRefused("That address isn't on the public internet.");
  }
  return url;
}

async function checkHost(hostname: string) {
  const bare = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(bare) ? [bare] : (await lookup(bare, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new FetchRefused("Couldn't find that website.");
  if (!addresses.every(isPublicAddress)) throw new FetchRefused("That address isn't on the public internet.");
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new FetchRefused("That page is too large to import.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchPublicHtml(raw: string): Promise<{ html: string; finalUrl: string }> {
  let url = checkUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await checkHost(url.hostname);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 (compatible; cookingwithtrevor-recipe-import/1.0)",
        },
      });
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      throw new FetchRefused(timedOut ? "That website took too long to answer." : "Couldn't reach that website.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new FetchRefused("That link redirects nowhere.");
      url = checkUrl(new URL(location, url).toString());
      continue;
    }
    if ([401, 402, 403, 429].includes(response.status)) {
      // The site turns away automated requests; respect that.
      throw new FetchRefused("That website doesn't allow recipes to be imported automatically. You can type it in below instead.");
    }
    if (!response.ok) throw new FetchRefused(`That website answered with an error (${response.status}).`);
    const type = response.headers.get("content-type") ?? "";
    if (!/html/i.test(type)) throw new FetchRefused("That link isn't a web page.");
    return { html: await readCapped(response), finalUrl: url.toString() };
  }
  throw new FetchRefused("That link redirects too many times.");
}
