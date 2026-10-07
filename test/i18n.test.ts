import { describe, expect, it } from "vitest";
import { DICTS } from "../app/src/i18n";
import { allKeys } from "./i18nKeys";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  const keys = [...allKeys()];

  it("finds the app's strings", () => {
    expect(keys.length).toBeGreaterThan(300);
    expect(keys).toContain("Start workout");
  });

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`${lang} covers every key with the same placeholders`, () => {
      const missing = keys.filter((k) => !(k in dict));
      expect(missing).toEqual([]);
      const broken = keys.filter((k) => placeholders(k).join() !== placeholders(dict[k]!).join());
      expect(broken).toEqual([]);
    });
  }
});
