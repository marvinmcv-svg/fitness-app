import { de } from "./locales/de";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import { pt } from "./locales/pt";

/**
 * Tiny gettext-style i18n: English source strings are the keys, so a missing
 * translation falls back to readable English. `{name}` placeholders are
 * filled from params. Every key used in the app must exist in each locale
 * (enforced by test/i18n.test.ts).
 */

export type Lang = "en" | "es" | "pt" | "fr" | "de" | "it";
export type Dict = Record<string, string>;

export const LANGS: { id: Lang; label: string; english: string }[] = [
  { id: "en", label: "English", english: "English" },
  { id: "es", label: "Español", english: "Spanish" },
  { id: "pt", label: "Português", english: "Portuguese" },
  { id: "fr", label: "Français", english: "French" },
  { id: "de", label: "Deutsch", english: "German" },
  { id: "it", label: "Italiano", english: "Italian" },
];

export const DICTS: Record<Exclude<Lang, "en">, Dict> = { es, pt, fr, de, it };

let current: Lang = "en";
let dict: Dict = {};

export function setLang(lang: Lang) {
  current = LANGS.some((l) => l.id === lang) ? lang : "en";
  dict = current === "en" ? {} : DICTS[current];
  if (typeof document !== "undefined") document.documentElement.lang = current;
}

export const lang = () => current;
export const langName = () => LANGS.find((l) => l.id === current)!.english;

export type Params = Record<string, string | number>;

export function t(key: string, params?: Params): string {
  const s = dict[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

/** Best match for the device language, English otherwise. */
export function detectLang(): Lang {
  const prefs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const p of prefs) {
    const base = p?.slice(0, 2).toLowerCase();
    if (LANGS.some((l) => l.id === base)) return base as Lang;
  }
  return "en";
}

/** "a, b and c" in the current language. */
export function listOf(items: string[]): string {
  try {
    return new Intl.ListFormat(current, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** Day labels are "<focus> <A|B|C>"; translate the focus part. */
export function dayName(label: string): string {
  const m = label.match(/^(.*)\s([ABC])$/);
  return m ? `${t(m[1]!)} ${m[2]}` : t(label);
}

/** Progression reasons come from the domain in English; translate the known shapes. */
export function progressionReason(reason: string): string {
  let m: RegExpMatchArray | null;
  if ((m = reason.match(/^All sets reached (\d+) reps$/))) return t("All sets reached {n} reps", { n: m[1]! });
  if ((m = reason.match(/^Build reps toward (\d+)$/))) return t("Build reps toward {n}", { n: m[1]! });
  if ((m = reason.match(/^Completed (\d+x\d+)$/))) return t("Completed {scheme}", { scheme: m[1]! });
  if ((m = reason.match(/^Missed (\d+x\d+) in (\d+) straight sessions$/))) return t("Missed {scheme} in {n} straight sessions", { scheme: m[1]!, n: m[2]! });
  if ((m = reason.match(/^Repeat load \((\d+) missed\)$/))) return t("Repeat load ({n} missed)", { n: m[1]! });
  if ((m = reason.match(/^Beat (\d+) reps$/))) return t("Beat {n} reps", { n: m[1]! });
  return reason;
}

/** Marks a string for translation where it is defined; translate it with `t()` where it is shown. */
export const N_ = (s: string) => s;

/** Pick the singular or plural form by `n` (both are keys), with `{n}` filled in. */
export const tn = (n: number, one: string, other: string, params?: Params) => t(n === 1 ? one : other, { n, ...params });
