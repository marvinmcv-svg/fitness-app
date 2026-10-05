// Records landing/demo.mp4 from the built app (npm run build:app first).
// Usage: node scripts/record-demo.mjs <frames-dir>, then encode with ffmpeg:
//   ffmpeg -f concat -safe 0 -i <frames-dir>/frames.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 24 -movflags +faststart -an landing/demo.mp4
import { chromium } from "playwright";
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
await page.goto("file:///home/user/fitness-app/dist/index.html");
await wait(300);
ch("Sign up in one tap");
await wait(2600);
await tap("text=Try it without an account", 900);
ch("Answer 7 quick questions");
await tap("text=Build muscle"); await tap("text=Continue", 700);
await tap("text=Some experience"); await tap("text=Continue", 700);
await tap(".day-pick >> nth=1", 900); await tap("text=Continue", 700);
await tap("text=Full gym"); await tap("text=Continue", 700);
await tap("button.chip >> text=Chest", 400); await tap("button.chip >> text=Side delts", 700); await tap("text=Continue", 700);
await page.click("#onb-name"); await page.keyboard.type("Marvin", { delay: 90 }); await wait(700);
await tap("text=Active", 800); await tap("text=Continue", 900);
ch("Get a plan built for you");
await wait(1800); await page.mouse.wheel(0, 260); await wait(1500);
await tap("text=Start training", 1400);
// fill history so the dashboard has real numbers
await page.click("button.avatar"); await wait(600);
await page.click("text=Load sample workouts"); await wait(500);
await page.click(".tab >> text=Today"); await wait(400);
ch("See every muscle against its weekly target");
await wait(2200);
await page.evaluate(() => document.querySelector(".ring-scroller")?.scrollBy({ left: 500, behavior: "smooth" })); await wait(1600);
ch("Log sets with progression hints and a rest timer");
await tap("text=Start workout", 1300);
const cards = page.locator(".wk-card");
await cards.nth(0).locator(".tick").nth(0).click(); await wait(600);
await cards.nth(1).locator(".tick").nth(0).click(); await wait(900);
await cards.nth(1).locator(".tick").nth(1).click(); await wait(1200);
for (let i = 2; i < 5; i++) {
  const card = cards.nth(i);
  await card.scrollIntoViewIfNeeded(); await wait(500);
  await card.locator(".tick").nth(0).click(); await wait(700);
  const more = card.locator(".stepper button[aria-label^='More']");
  if (await more.count()) {
    for (let k = 0; k < 4; k++) { await more.first().click(); await wait(260); }
    await wait(900);
    break;
  }
}
await wait(800);
await tap("button[aria-label='Minimize workout']", 900);
ch("Swap any exercise for one that suits you");
await tap(".tab >> text=Program", 1200);
await tap(".row-btn >> nth=1", 1300);
await tap(".sheet .row-btn >> nth=1", 1400);
ch("Track macros by photo, barcode or search");
await tap(".tab >> text=Macros", 1500);
await tap("text=Snap a meal", 1800);
await tap("[role=tab] >> text=Search", 500);
await page.click("#food-search"); await page.keyboard.type("chicken", { delay: 90 }); await wait(700);
await tap(".food-results .row-btn >> nth=0", 1200);
await tap("text=/Add to/", 1600);
await tap("text=Search foods", 500); await tap("[role=tab] >> text=Search", 300);
await page.click("#food-search"); await page.keyboard.type("rice", { delay: 90 }); await wait(500);
await tap(".food-results .row-btn >> nth=0", 900); await tap("text=/Add to/", 1800);
ch("Watch your progress week by week");
await tap(".tab >> text=Progress", 1800);
await page.mouse.wheel(0, 500); await wait(1800);
await page.mouse.wheel(0, -500); await wait(900);
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
