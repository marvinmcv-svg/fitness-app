// Turns the single-file build (dist/index.html) into an Artifact page body:
// the host supplies <!doctype>, <html>, <head> and <body>, so this keeps only
// the title, font links, inlined style/script and the app root.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*)<\/head>/i)?.[1] ?? "";
const body = html.match(/<body>([\s\S]*)<\/body>/i)?.[1] ?? "";

const keep = [
  ...head.matchAll(/<title>[\s\S]*?<\/title>|<link[^>]+fonts\.(?:googleapis|gstatic)[^>]*>|<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi),
].map((m) => m[0]);

// Module scripts in <head> run deferred, so the root div exists when they execute.
const out = [...keep.filter((t) => !t.startsWith("<script")), body.trim(), ...keep.filter((t) => t.startsWith("<script"))].join("\n");
writeFileSync("dist/fuerzaflow.html", out + "\n");
console.log(`dist/fuerzaflow.html (${(out.length / 1024).toFixed(0)} KB)`);
