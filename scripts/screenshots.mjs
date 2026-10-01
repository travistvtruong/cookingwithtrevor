// Re-take the README screenshots from the live site: `npm run screenshots`.
// Drives Chrome over the DevTools Protocol for true mobile emulation (headless
// Chrome on Windows won't size a window below ~500px). No extra dependencies.
//
// Options (env vars): CHROME_PATH, SITE_URL, RECIPE_PATH, REVIEW_PATH.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.SITE_URL ?? "https://cookingwithtrevor.vercel.app";
const OUT = join(import.meta.dirname, "..", "docs", "screenshots");
const PORT = 9333;
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false };

// Newest published recipe and review (first card on the section page, which
// refreshes every minute), unless given explicitly.
async function newest(kind) {
  const html = await fetch(`${BASE}/${kind}`).then((r) => r.text());
  return html.match(new RegExp(`href="(/${kind}/[a-z0-9-]+)"`))?.[1];
}

const shots = [
  ["home-desktop", "/", DESKTOP],
  ["home-mobile", "/", PHONE],
  ["recipe-mobile", process.env.RECIPE_PATH ?? (await newest("recipes")), PHONE],
  ["review-mobile", process.env.REVIEW_PATH ?? (await newest("reviews")), PHONE],
].filter(([, path]) => path);
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "cwt-shots-"))}`,
  "--hide-scrollbars",
  "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
      .then((r) => r.json())
      .catch(() => null);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result ?? msg.error);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  for (const [name, path, device] of shots) {
    await send("Emulation.setDeviceMetricsOverride", device);
    await send("Emulation.setTouchEmulationEnabled", { enabled: device.mobile });
    await send("Page.navigate", { url: BASE + path });
    await sleep(5000); // let photos and fonts load
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
    console.log(`saved docs/screenshots/${name}.png (${path})`);
  }
  ws.close();
} finally {
  chrome.kill();
}
