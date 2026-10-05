import { z } from "zod";
import { progressionRuleSchema } from "./progression";
import { SLOT_TYPES, TARGET_EFFORTS } from "./types";

/**
 * Method template DSL: a program is days of ordered slots. Each slot carries
 * its role (primer, main, burnout...), prescription, techniques and an
 * optional progression rule. Templates are plain JSON so coaches can author
 * and version them, and users can import/export them.
 */
const range = z
  .object({ min: z.number().int().nonnegative(), max: z.number().int().nonnegative() })
  .refine((r) => r.min <= r.max, { message: "min must be <= max" });

export const slotSchema = z.object({
  slotType: z.enum(SLOT_TYPES),
  exercise: z.string().min(1),
  alternatives: z.array(z.string().min(1)).default([]),
  sets: range,
  /** null = to failure (no fixed rep target). */
  reps: range.nullable(),
  effort: z.enum(TARGET_EFFORTS),
  rir: z.number().int().min(0).max(5).optional(),
  restSec: z.number().int().positive().optional(),
  /** Technique applied to the set itself (e.g. trap_set). */
  technique: z.string().optional(),
  /** Techniques appended after the working reps (e.g. partials). */
  finishers: z.array(z.string()).default([]),
  progression: progressionRuleSchema.optional(),
  notes: z.string().optional(),
});
export type Slot = z.infer<typeof slotSchema>;

export const programDaySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  slots: z.array(slotSchema).min(1),
});
export type ProgramDay = z.infer<typeof programDaySchema>;

export const programTemplateSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    version: z.number().int().positive(),
    description: z.string().optional(),
    /** Ordered keys of `days`; repeats allowed (a week can revisit a day). */
    weekLayout: z.array(z.string()).min(1).max(7),
    days: z.array(programDaySchema).min(1),
  })
  .superRefine((t, ctx) => {
    const keys = new Set<string>();
    for (const day of t.days) {
      if (keys.has(day.key)) ctx.addIssue({ code: "custom", message: `Duplicate day key: ${day.key}` });
      keys.add(day.key);
    }
    for (const key of t.weekLayout) {
      if (!keys.has(key)) ctx.addIssue({ code: "custom", message: `weekLayout references unknown day: ${key}` });
    }
  });
export type ProgramTemplate = z.infer<typeof programTemplateSchema>;

/** Default rest when a slot does not specify one. */
export function defaultRestSec(slot: Pick<Slot, "slotType" | "restSec">): number {
  if (slot.restSec) return slot.restSec;
  switch (slot.slotType) {
    case "warmup":
    case "primer":
    case "corrective":
      return 75;
    case "main":
      return 150;
    case "accessory":
      return 120;
    case "burnout":
      return 90;
  }
}

/**
 * Parse and check a template against a catalog: every exercise and technique
 * it references must exist. Returns the parsed template or a list of errors.
 */
export function validateTemplate(
  input: unknown,
  known: { exercises: ReadonlySet<string>; techniques: ReadonlySet<string> },
): { ok: true; template: ProgramTemplate } | { ok: false; errors: string[] } {
  const parsed = programTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }

  const errors: string[] = [];
  for (const day of parsed.data.days) {
    day.slots.forEach((slot, i) => {
      const where = `${day.key}[${i}]`;
      for (const ex of [slot.exercise, ...slot.alternatives]) {
        if (!known.exercises.has(ex)) errors.push(`${where}: unknown exercise "${ex}"`);
      }
      for (const t of [...(slot.technique ? [slot.technique] : []), ...slot.finishers]) {
        if (!known.techniques.has(t)) errors.push(`${where}: unknown technique "${t}"`);
      }
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, template: parsed.data };
}
