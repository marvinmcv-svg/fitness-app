// Collects every English source string the app translates, for the locale
// coverage test and for `node scripts/i18n-keys.mjs` (prints missing keys).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCES = ["app/src", "src/domain/coach.ts"];

function files(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((f) => (f === "locales" ? [] : files(join(path, f)))).filter((f) => /\.tsx?$/.test(f));
}

const unquote = (lit) => JSON.parse(lit);

/** String literals passed to t(), tr(), N_() and tn() calls. */
export function literalKeys(root = ".") {
  const keys = new Set();
  for (const file of SOURCES.flatMap((s) => files(join(root, s)))) {
    const src = readFileSync(file, "utf8");
    const call = /\b(t|tr|N_|tn)\(/g;
    let m;
    while ((m = call.exec(src))) {
      // Walk to the matching paren; collect string literals at depth 1.
      let depth = 1;
      let i = call.lastIndex;
      while (i < src.length && depth > 0) {
        const c = src[i];
        if (c === '"') {
          let j = i + 1;
          while (src[j] !== '"') j += src[j] === "\\" ? 2 : 1;
          if (depth === 1) keys.add(unquote(src.slice(i, j + 1)));
          i = j + 1;
          continue;
        }
        if (c === "(" || c === "{" || c === "[") depth++;
        else if (c === ")" || c === "}" || c === "]") depth--;
        i++;
        if (m[1] !== "tn" && depth === 1 && c === ",") break; // only the first argument is a key
      }
    }
  }
  keys.delete("");
  return keys;
}
