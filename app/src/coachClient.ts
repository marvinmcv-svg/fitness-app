import { TEMPLATES, templateBySlug } from "../../src/data/templates";
import { COACH_SYSTEM, COACH_TOOLS, LIMITS, PROPOSED, REMEMBERED, toAction, type CoachAction, type CoachTurn } from "../../src/coach/spec";
import { swapOptions } from "../../src/domain/personalize";
import { sumMacros } from "../../src/domain/nutrition";
import {
  catalog,
  dayLabel,
  exerciseHistory,
  exerciseName,
  muscleName,
  nextDayKey,
  program,
  rollingVolume,
  targetsFor,
  targetsMacros,
  workingSets,
  type AppState,
} from "./store";
import { langName, t } from "./i18n";

/** Compact, model-readable snapshot of the athlete. Kept under LIMITS.contextChars. */
export function buildContext(s: AppState) {
  const p = s.profile;
  const targets = targetsFor(s.preset);
  const { volume, workouts } = rollingVolume(s.history);
  const today = new Date();
  const eatenToday = s.food.filter((f) => sameDay(new Date(f.eatenAt), today));
  const base = p ? templateBySlug(p.programSlug) : undefined;

  return {
    athlete: p && {
      name: p.name || undefined,
      goal: p.goal,
      experience: p.experience,
      days_per_week: p.daysPerWeek,
      equipment: p.equipment,
      focus_muscles: p.focusMuscles,
      sex: p.sex,
      age: p.age,
      height_cm: p.heightCm,
      weight_kg: p.weightKg,
      activity: p.activity,
    },
    memory: s.coach.memory.map((m) => m.note),
    program: {
      name: program.name,
      slug: program.slug,
      next_day: nextDayKey(s.history),
      in_progress: s.active ? s.active.dayKey : null,
      days: program.days.map((d) => ({
        key: d.key,
        label: d.label,
        slots: d.slots.map((slot) => {
          const baseSlot = base?.days.find((x) => x.key === d.key)?.slots[slot.baseIndex];
          return {
            slot_index: slot.baseIndex,
            type: slot.slotType,
            exercise: slot.exercise,
            sets: `${slot.sets.min}-${slot.sets.max}`,
            reps: slot.reps ? `${slot.reps.min}-${slot.reps.max}` : "to failure",
            options: baseSlot ? swapOptions(baseSlot, catalog.exercises, p?.equipment ?? "gym").map((e) => e.slug).filter((x) => x !== slot.exercise).slice(0, 6) : [],
          };
        }),
      })),
      other_programs: TEMPLATES.filter((t) => t.slug !== program.slug).map((t) => `${t.slug}: ${t.description}`),
    },
    weekly_sets_last_7_days: Object.fromEntries(
      targets.map((t) => [muscleName.get(t.muscle) ?? t.muscle, `${volume.get(t.muscle)?.effectiveSets ?? 0} of ${t.minSets}-${t.maxSets}`]),
    ),
    sessions_last_7_days: workouts.length,
    recent_workouts: s.history.slice(-5).map((w) => ({
      date: w.startedAt.slice(0, 10),
      day: w.programDayId ? dayLabel(w.programDayId) : "Freestyle",
      working_sets: workingSets(w),
      top_sets: w.exercises
        .filter((e) => e.slotType === "main")
        .map((e) => {
          const top = [...e.sets].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
          return top ? `${exerciseName(e.exercise)} ${top.weight ?? "BW"}x${top.reps ?? 0}` : exerciseName(e.exercise);
        }),
    })),
    lift_trends: mainLifts(s).map((slug) => ({
      exercise: exerciseName(slug),
      last_sessions: exerciseHistory(s.history, slug)
        .slice(-4)
        .map((h) => h.sets.map((x) => `${x.weight || "BW"}x${x.reps}`).join(", ")),
    })),
    nutrition: {
      daily_targets: targetsMacros(p),
      eaten_today: sumMacros(eatenToday.map((e) => e.macros)),
      foods_today: eatenToday.map((e) => `${e.meal}: ${e.name} (${e.macros.calories} kcal, ${e.macros.protein}g P)`),
    },
    local_time: today.toLocaleString(),
    reply_language: langName(),
  };
}

function mainLifts(s: AppState): string[] {
  const out = new Set<string>();
  for (const d of program.days) for (const slot of d.slots) if (slot.slotType === "main") out.add(slot.exercise);
  return [...out].filter((slug) => exerciseHistory(s.history, slug).length).slice(0, 8);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* -------------------------------------------------------------- transport */

export type CoachResult = { ok: true; reply: string; actions: CoachAction[] } | { ok: false; error: string; code?: string };

type SampleFn = ((input: unknown, opts?: Record<string, unknown>) => Promise<{ text: string }>) | null;
let samplePromise: Promise<SampleFn> | null = null;

/** In the claude.ai preview, the page can ask Claude directly (the viewer's account). */
function previewSample(): Promise<SampleFn> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  samplePromise ??= c.use("sample").then((s) => (s as SampleFn) ?? null).catch(() => null);
  return samplePromise;
}

export async function coachAvailable(): Promise<"preview" | "server"> {
  return (await previewSample()) ? "preview" : "server";
}

export async function askCoach(turns: CoachTurn[], context: unknown): Promise<CoachResult> {
  const trimmed = turns.slice(-LIMITS.turns).map((t) => ({ ...t, content: t.content.slice(0, LIMITS.turnChars) }));
  while (trimmed.length && trimmed[0]!.role !== "user") trimmed.shift();

  const sample = await previewSample();
  if (sample) return askViaPreview(sample, trimmed, context);

  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: trimmed, context }),
    });
    const body = (await res.json().catch(() => ({}))) as { reply?: string; actions?: CoachAction[]; error?: string; code?: string };
    if (!res.ok) return { ok: false, error: body.code === "rate_limited" ? t("Too many questions at once. Try again in a minute.") : body.code ? t("The coach couldn't answer. Try again.") : (body.error ?? t("The coach couldn't answer. Try again.")), code: body.code };
    return { ok: true, reply: body.reply ?? "", actions: body.actions ?? [] };
  } catch {
    return { ok: false, error: t("You're offline. The coach needs a connection; your logging still works."), code: "offline" };
  }
}

async function askViaPreview(sample: NonNullable<SampleFn>, turns: CoachTurn[], context: unknown): Promise<CoachResult> {
  const actions: CoachAction[] = [];
  const tools = COACH_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.input_schema,
    execute: (input: Record<string, unknown>) => {
      const a = toAction(t.name, input);
      if (a) actions.push(a);
      return a?.type === "remember" ? REMEMBERED : PROPOSED;
    },
  }));
  const preamble = `${COACH_SYSTEM}\n\nATHLETE DATA (today is ${new Date().toISOString().slice(0, 10)}):\n${JSON.stringify(context)}`;
  try {
    const { text } = await sample([{ role: "user", content: preamble }, { role: "assistant", content: "Understood. I'll coach from this data." }, ...turns], {
      tools,
      cache: false,
    });
    return { ok: true, reply: text.trim() || t("Done. Check the suggestions below."), actions };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "not_granted") return { ok: false, error: t("Allow this page to ask Claude to use the coach here."), code };
    if (code === "rate_limited") return { ok: false, error: t("Too many questions at once. Try again in a minute."), code };
    return { ok: false, error: t("The coach couldn't answer. Try again."), code };
  }
}
