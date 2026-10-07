// Captures the app screens used on the landing page (landing/screens/*.jpg)
// from the preview build. Run `npm run build:artifact` first. The committed files
// were then scaled to 600px wide: for f in landing/screens/*.jpg; do ffmpeg -i $f -vf scale=600:-1 -q:v 4 ...; done
// Playwright is installed globally in the cloud container, not as a project dependency.
const { chromium } = await import("playwright").catch(() => import("/opt/node22/lib/node_modules/playwright/index.mjs"));
import { mkdirSync } from "node:fs";

const OUT = "landing/screens";
const APP = "file://" + process.cwd() + "/dist/index.html";
const KEY = "fuerzaflow:v1";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light", locale: "en-US" });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  await wait(450);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
};

// Guest sign-up through the questionnaire, then sample history.
await page.goto(APP);
await wait(400);
await shot("welcome");
await page.click(".auth-actions .btn-plain");
const next = () => page.click(".onb-foot .btn-primary");
await page.click("text=Build muscle"); await next(); await wait(150);
await page.click("text=Some experience"); await next(); await wait(150);
await page.click(".day-pick >> nth=1"); await next(); await wait(150);
await page.click("text=Full gym"); await next(); await wait(150);
await page.click("button.chip >> text=Chest"); await page.click("button.chip >> text=Side delts"); await next(); await wait(150);
await page.fill("#onb-name", "Sofia");
await page.click("text=Female"); await page.fill("#onb-weight", "64"); await page.fill("#onb-height", "168");
await page.click("text=Active"); await next(); await wait(300);
await shot("plan");
await next(); await wait(300);
await page.click("button.avatar"); await wait(200);
await page.click("text=Load sample workouts"); await wait(200);

/** Patch the saved state and reload so the app starts from it. */
async function patch(fn) {
  await page.evaluate(([key, src]) => {
    const s = JSON.parse(localStorage.getItem(key));
    const next = new Function("s", `return (${src})(s)`)(s);
    localStorage.setItem(key, JSON.stringify(next));
  }, [KEY, fn.toString()]);
  await page.reload();
  await wait(500);
}

// Some food today, so the macro rings have something to show.
await patch((s) => {
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const f = (id, meal, name, grams, h, calories, protein, carbs, fat, source = "catalog") => ({ id, meal, name, grams, eatenAt: at(h, 0), source, macros: { calories, protein, carbs, fat } });
  s.food = [
    f("f1", "breakfast", "Rolled oats, dry", 60, 7, 228, 8, 40, 4),
    f("f2", "breakfast", "Egg, whole", 100, 7, 143, 12.6, 0.7, 9.5),
    f("f3", "lunch", "Chicken breast, cooked", 150, 12, 248, 46.5, 0, 5.4),
    f("f4", "lunch", "White rice, cooked", 200, 12, 260, 5.4, 56, 0.6),
    f("f5", "snack", "Whey protein powder", 30, 16, 120, 24, 3, 1.5),
    f("f6", "snack", "Banana", 118, 16, 105, 1.3, 27, 0.4),
  ];
  return s;
});

const tab = (i) => page.click(`.tabbar .tab >> nth=${i}`);
const accents = ["violet", "ember", "ocean", "forest", "rose", "graphite"];
for (const accent of accents) {
  await page.evaluate(([key, accent]) => {
    const s = JSON.parse(localStorage.getItem(key));
    s.settings = { ...s.settings, accent, appearance: "light", lang: "en" };
    localStorage.setItem(key, JSON.stringify(s));
  }, [KEY, accent]);
  await page.reload(); await wait(500);
  await shot(`today-${accent}`);
}
for (const accent of accents) {
  await page.evaluate(([key, accent]) => {
    const s = JSON.parse(localStorage.getItem(key));
    s.settings = { ...s.settings, accent, appearance: "dark", lang: "en" };
    localStorage.setItem(key, JSON.stringify(s));
  }, [KEY, accent]);
  await page.reload(); await wait(500);
  await shot(`today-${accent}-dark`);
}
for (const lang of ["es", "pt", "fr", "de", "it"]) {
  await page.evaluate(([key, lang]) => {
    const s = JSON.parse(localStorage.getItem(key));
    s.settings = { ...s.settings, accent: "violet", appearance: "light", lang };
    localStorage.setItem(key, JSON.stringify(s));
  }, [KEY, lang]);
  await page.reload(); await wait(500);
  await shot(`today-${lang}`);
}

// Back to English, violet, light for the feature screens.
await page.evaluate((key) => {
  const s = JSON.parse(localStorage.getItem(key));
  s.settings = { appearance: "light", accent: "violet", lang: "en" };
  localStorage.setItem(key, JSON.stringify(s));
}, KEY);
await page.reload(); await wait(500);

await tab(2); await shot("macros");
await tab(1); await shot("program");
await page.click(".list .row-btn >> nth=1"); await wait(300); await shot("swap");
await page.click(".sheet-backdrop", { position: { x: 20, y: 20 } }); await wait(200);
await tab(3); await shot("progress");

// Readiness check on a short-sleep day.
await tab(0);
await page.click(".btn-hero"); await wait(300);
await page.click(".segmented button >> nth=0"); await wait(150);
await page.click(".chip-grid .chip >> text=Chest"); await wait(150);
await shot("readiness");
await page.click(".sheet .btn-primary"); await wait(500);
const cards = page.locator(".wk-card");
await cards.nth(1).locator(".tick").nth(0).click(); await wait(300);
await cards.nth(1).locator(".tick").nth(1).click(); await wait(300);
// Clicking far down the list can nudge outer containers sideways; reset every scroller.
await page.evaluate(() => {
  for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) if (el && el.scrollLeft) el.scrollLeft = 0;
  document.querySelector(".wk-scroll")?.scrollTo(0, 0);
});
await wait(1200);
await shot("workout");
await page.click("button[aria-label='Minimize workout']"); await wait(300);

// A coach conversation (staged: the preview build has no model behind it).
await page.evaluate((key) => {
  const s = JSON.parse(localStorage.getItem(key));
  const at = new Date().toISOString();
  s.coach.memory = [{ id: "m1", note: "Left shoulder gets cranky on heavy overhead pressing", at }];
  s.coach.chat = [
    { id: "c1", role: "user", content: "I only have 30 minutes today", at },
    {
      id: "c2",
      role: "assistant",
      at,
      content:
        "Then keep the presses and rows, cut the rest. Do 3 sets of incline dumbbell press and 3 of seated cable row, then superset lateral raises with curls for 2 rounds.\n\nYou're at 9 of 10 sets for lats this week, so the rows close that gap. With your shoulder in mind, I'd swap the dumbbell fly for push-ups.",
      actions: [{ action: { type: "swap_exercise", day_key: "upper-b", slot_index: 2, exercise: "pushup", reason: "Easier on your left shoulder and no setup time." }, status: "pending" }],
    },
  ];
  localStorage.setItem(key, JSON.stringify(s));
}, KEY);
await page.reload(); await wait(500);
await page.click(".coach-brief .btn-small"); await wait(700);
await shot("coach");

await browser.close();
console.log("saved to", OUT);
