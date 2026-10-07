import { EXERCISES, MUSCLES, TECHNIQUES } from "../src/data/catalog";
import { FOODS } from "../src/data/foods";
import { TEMPLATES } from "../src/data/templates";
import { RED_FLAG_REPLY } from "../src/domain/coach";
// @ts-expect-error plain ESM helper without types
import { literalKeys } from "../scripts/i18n-keys.mjs";

/** Every string the app shows that goes through t(): literals in code plus catalog data. */
export function allKeys(): Set<string> {
  const keys = literalKeys() as Set<string>;
  for (const m of MUSCLES) keys.add(m.name);
  for (const e of EXERCISES) keys.add(e.name);
  for (const x of TECHNIQUES) keys.add(x.name);
  for (const f of FOODS) keys.add(f.name).add(f.serving.label);
  for (const tp of TEMPLATES) {
    keys.add(tp.name);
    if (tp.description) keys.add(tp.description);
    for (const d of tp.days) keys.add(d.label.replace(/\s[ABC]$/, ""));
  }
  for (const r of Object.values(RED_FLAG_REPLY)) keys.add(r);
  return keys;
}

