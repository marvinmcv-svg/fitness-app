// Assembles the deployed site after the app build: the landing page and its
// media at /, the app (already built by Vite) at /app/.
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

if (!existsSync("dist/app/index.html")) throw new Error("Build the app first (vite build --base=/app/ --outDir ../dist/app).");
for (const f of readdirSync("landing")) cpSync(`landing/${f}`, `dist/${f}`, { recursive: true });

// The waitlist form talks to Supabase directly; it needs the same public URL and
// publishable key as the app (set in Vercel). Without them the form says sign-ups open soon.
const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
if (url && key) {
  const page = readFileSync("dist/index.html", "utf8").replace("__SUPABASE_URL__", url).replace("__SUPABASE_PUBLISHABLE_KEY__", key);
  writeFileSync("dist/index.html", page);
} else {
  console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set: the landing page waitlist is off.");
}
// The app used to live at / with a service worker there. This one replaces it
// and unregisters itself, so old installs stop intercepting the landing page.
writeFileSync(
  "dist/sw.js",
  `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.registration.unregister()));
`,
);
console.log("dist/: landing page at /, app at /app/");
