// Records landing/demo.mp4 from the built app (npm run build:app first).
// Usage: node scripts/record-demo.mjs <frames-dir>, then encode with ffmpeg:
//   ffmpeg -f concat -safe 0 -i <frames-dir>/frames.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 24 -movflags +faststart -an landing/demo.mp4
// Playwright is installed globally in the cloud container, not as a project dependency.
const { chromium } = await import("playwright").catch(() => import("/opt/node22/lib/node_modules/playwright/index.mjs"));
import { writeFileSync } from "node:fs";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light",
});
const page = await ctx.newPage();
await page.goto("about:blank");
const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = `${out}/frame-${String(n++).padStart(5, "0")}.jpg`;
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, ts: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
const t0 = Date.now();
const chapters = [];
const ch = (title) => chapters.push({ t: +((Date.now() - t0) / 1000).toFixed(1), title });
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (sel, pause = 650) => { await page.click(sel); await wait(pause); };
await page.goto("file://" + process.cwd() + "/dist/index.html");
await wait(300);
ch("Sign up in one tap");
await wait(2400);
await tap("text=Try it without an account", 900);
ch("Answer 7 quick questions");
await tap("text=Build muscle"); await tap("text=Continue", 650);
await tap("text=Some experience"); await tap("text=Continue", 650);
await tap(".day-pick >> nth=1", 800); await tap("text=Continue", 650);
await tap("text=Full gym"); await tap("text=Continue", 650);
await tap("button.chip >> text=Chest", 400); await tap("button.chip >> text=Side delts", 650); await tap("text=Continue", 650);
await page.click("#onb-name"); await page.keyboard.type("Sofia", { delay: 90 }); await wait(500);
await tap("text=Female", 400); await tap("text=Active", 700); await tap("text=Continue", 900);
ch("Get a plan built for you");
await wait(1600); await page.mouse.wheel(0, 260); await wait(1300);
await tap("text=Start training", 1300);
// fill history so the dashboard has real numbers
await page.click("button.avatar"); await wait(500);
await page.click("text=Load sample workouts"); await wait(400);
await page.click(".tab >> text=Today"); await wait(400);
ch("Your coach briefs you every day");
await wait(1600);
await page.evaluate(() => document.querySelector(".viewport")?.scrollTo({ top: 520, behavior: "smooth" })); await wait(2200);
await page.evaluate(() => document.querySelector(".viewport")?.scrollTo({ top: 0, behavior: "smooth" })); await wait(900);
ch("A 10-second check-in adjusts today's workout");
await tap(".btn-hero", 1100);
await tap(".sheet .segmented button >> nth=0", 900);
await tap(".sheet .chip-grid .chip >> text=Chest", 1000);
await tap(".sheet .chip-grid .chip >> text=45 min", 1600);
await tap(".sheet .btn-primary", 1400);
ch("Log sets with progression hints and a rest timer");
const cards = page.locator(".wk-card");
await cards.nth(0).locator(".tick").nth(0).click(); await wait(600);
await cards.nth(1).locator(".tick").nth(0).click(); await wait(900);
await cards.nth(1).locator(".tick").nth(1).click(); await wait(1400);
await tap("button[aria-label='Minimize workout']", 900);
ch("Swap any exercise for one that suits you");
await tap(".tab >> text=Program", 1100);
await tap(".row-btn >> nth=1", 1200);
await tap(".sheet .row-btn >> nth=1", 1300);
ch("Track macros by photo, barcode or search");
await tap(".tab >> text=Macros", 1300);
await tap("text=Search foods", 500); await tap("[role=tab] >> text=Search", 300);
await page.click("#food-search"); await page.keyboard.type("chicken", { delay: 90 }); await wait(600);
await tap(".food-results .row-btn >> nth=0", 900);
await tap("text=/Add to/", 1700);
ch("Make it yours: themes and dark mode");
await tap(".tab >> text=Today", 500);
await tap("button.avatar", 800);
await page.evaluate(() => document.querySelector(".viewport")?.scrollTo({ top: 330, behavior: "smooth" })); await wait(900);
await tap(".swatch >> nth=1", 900);
await tap(".swatch >> nth=2", 900);
await tap(".swatch >> nth=3", 900);
await tap("[role=radio] >> text=Dark", 1300);
ch("In your language");
await page.evaluate(() => document.querySelector(".viewport")?.scrollTo({ top: 640, behavior: "smooth" })); await wait(800);
await tap("[role=radio] >> text=Español", 1100);
await tap(".tab >> nth=0", 2200);
await page.evaluate(() => document.querySelector(".viewport")?.scrollTo({ top: 480, behavior: "smooth" })); await wait(2000);
const dur = (Date.now() - t0) / 1000;
await cdp.send("Page.stopScreencast");
await wait(300);
await ctx.close(); await browser.close();
// ffmpeg concat list: each frame shown until the next one arrives
const lines = [];
const start = frames[0].ts;
for (let i = 0; i < frames.length; i++) {
  const next = i + 1 < frames.length ? frames[i + 1].ts : frames[i].ts + 1;
  lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].ts).toFixed(4)}`);
}
lines.push(`file '${frames.at(-1).file}'`);
writeFileSync(`${out}/frames.txt`, lines.join("\n"));
console.log("first frame offset", (start * 1000 - t0) / 1000);
writeFileSync(`${out}/chapters.json`, JSON.stringify({ duration: dur, chapters }, null, 2));
console.log(JSON.stringify({ dur, chapters }));
