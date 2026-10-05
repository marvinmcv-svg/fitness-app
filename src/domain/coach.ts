import type { Macros } from "./nutrition";
import type { SessionResult } from "./progression";
import type { SlotType, VolumeTarget, Workout } from "./types";

/**
 * The rules-based half of the coach: deterministic, offline and free.
 * The conversational coach (LLM) builds on the same facts.
 */

/* ------------------------------------------------------------ strength */

/** Estimated one-rep max (Epley). Only trusted up to 12 reps. */
export function e1rm(weight: number, reps: number): number | null {
  if (!(weight > 0) || reps < 1 || reps > 12) return null;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface PersonalRecord {
  exercise: string;
  kind: "e1rm" | "reps";
  value: number;
  previous: number | null;
  /** The set that set it, e.g. "100 kg × 5". */
  set: string;
}

/** Records set in `workout` compared with everything logged before it. */
export function findRecords(workout: Workout, before: readonly Workout[]): PersonalRecord[] {
  const out: PersonalRecord[] = [];
  for (const ex of workout.exercises) {
    if (ex.slotType === "primer" || ex.slotType === "warmup" || ex.slotType === "corrective") continue;
    const prior = before.flatMap((w) => w.exercises.filter((e) => e.exercise === ex.exercise).flatMap((e) => e.sets));
    const loaded = ex.sets.filter((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0);

    if (loaded.length) {
      let best = { v: 0, set: "" };
      for (const s of loaded) {
        const v = e1rm(s.weight!, s.reps!);
        if (v && v > best.v) best = { v, set: `${s.weight} ${s.unit} × ${s.reps}` };
      }
      const prev = Math.max(0, ...prior.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0) ?? 0));
      if (best.v > 0 && prior.length && best.v > prev) {
        out.push({ exercise: ex.exercise, kind: "e1rm", value: best.v, previous: prev || null, set: best.set });
      }
    } else {
      // Bodyweight work: most reps in a set.
      const reps = Math.max(0, ...ex.sets.map((s) => s.reps ?? 0));
      const prev = Math.max(0, ...prior.map((s) => s.reps ?? 0));
      if (reps > 0 && prior.length && reps > prev) {
        out.push({ exercise: ex.exercise, kind: "reps", value: reps, previous: prev || null, set: `${reps} reps` });
      }
    }
  }
  return out;
}

/** True when the last `sessions` sessions moved neither load nor reps up. */
export function isStalled(history: readonly SessionResult[], sessions = 3): boolean {
  if (history.length < sessions) return false;
  const recent = history.slice(-sessions);
  const score = (s: SessionResult) => {
    const top = Math.max(...s.sets.map((x) => x.weight));
    const reps = s.sets.filter((x) => x.weight === top).reduce((n, x) => n + x.reps, 0);
    return { top, reps };
  };
  const first = score(recent[0]!);
  return recent.slice(1).every((s) => {
    const c = score(s);
    return c.top < first.top || (c.top === first.top && c.reps <= first.reps);
  });
}

/* ----------------------------------------------------------- readiness */

export interface Readiness {
  sleep: "poor" | "ok" | "great";
  energy: "low" | "normal" | "high";
  /** Muscle slugs that are sore. */
  sore: readonly string[];
  /** Minutes available, or null for no limit. */
  minutes: number | null;
}

export interface PlannedSlot {
  slotType: SlotType;
  exercise: string;
  primaryMuscles: string[];
  sets: { min: number; max: number };
  restSec: number;
}

export interface AdjustedSlot {
  keep: boolean;
  sets: number;
  note?: string;
}

export interface SessionAdjustment {
  slots: AdjustedSlot[];
  minutes: number;
  /** Plain-language summary of what changed and why. */
  notes: string[];
  /** Coaching cue for effort today. */
  effortCue: string;
}

const WORK_SEC = 40; // average time under the bar per set, set-up included

export function estimateMinutes(slots: readonly { sets: number; restSec: number; keep?: boolean }[]): number {
  const sec = slots.filter((s) => s.keep !== false).reduce((t, s) => t + s.sets * (WORK_SEC + s.restSec), 0);
  return Math.round(sec / 60);
}

/**
 * Autoregulate today's session from a 4-question check-in: trim volume on a
 * bad day, ease off sore muscles, and fit the session into the time available.
 */
export function adjustSession(plan: readonly PlannedSlot[], r: Readiness): SessionAdjustment {
  const notes: string[] = [];
  const lowDay = r.sleep === "poor" || r.energy === "low";
  const greatDay = r.sleep === "great" && r.energy === "high";
  const sore = new Set(r.sore);

  const slots: AdjustedSlot[] = plan.map((s) => ({ keep: true, sets: s.sets.max }));

  if (lowDay) {
    plan.forEach((s, i) => {
      if (s.slotType === "burnout") slots[i] = { keep: false, sets: 0, note: "Skipped: low-recovery day" };
      else if (s.slotType !== "primer" && s.slotType !== "warmup") slots[i] = { keep: true, sets: s.sets.min };
    });
    notes.push(r.sleep === "poor" ? "You slept poorly, so every exercise is at its minimum sets and burnouts are off." : "Energy is low, so every exercise is at its minimum sets and burnouts are off.");
  }

  let soreHits = 0;
  plan.forEach((s, i) => {
    if (!s.primaryMuscles.some((m) => sore.has(m)) || !slots[i]!.keep) return;
    soreHits++;
    if (s.slotType === "accessory" || s.slotType === "burnout") slots[i] = { keep: false, sets: 0, note: "Skipped: sore" };
    else if (s.slotType === "main") slots[i] = { keep: true, sets: s.sets.min, note: "Lighter: sore" };
  });
  if (soreHits) notes.push(`Eased off ${soreHits} exercise${soreHits === 1 ? "" : "s"} that hit sore muscles. Train them, just with less volume.`);

  if (r.minutes) {
    const fits = () => estimateMinutes(plan.map((s, i) => ({ ...slots[i]!, restSec: s.restSec }))) <= r.minutes!;
    const dropped: string[] = [];
    // Drop finishers first, then accessories from the end, then trim main lifts to their minimum.
    const order: SlotType[] = ["burnout", "accessory"];
    for (const type of order) {
      for (let i = plan.length - 1; i >= 0 && !fits(); i--) {
        if (plan[i]!.slotType === type && slots[i]!.keep) {
          slots[i] = { keep: false, sets: 0, note: `Skipped: ${r.minutes} min session` };
          dropped.push(plan[i]!.exercise);
        }
      }
    }
    for (let i = 0; i < plan.length && !fits(); i++) {
      if (plan[i]!.slotType === "main" && slots[i]!.keep) slots[i] = { ...slots[i]!, sets: plan[i]!.sets.min };
    }
    if (dropped.length) notes.push(`Cut ${dropped.length} exercise${dropped.length === 1 ? "" : "s"} to fit ${r.minutes} minutes. Main lifts stay.`);
    if (!fits()) notes.push(`Even trimmed, this runs past ${r.minutes} minutes. Shorten rests on accessories if you need to.`);
  }

  if (!notes.length) notes.push(greatDay ? "You're well recovered. Run the full session and push the last set of each lift." : "Normal day. Run the session as planned.");
  const effortCue = lowDay
    ? "Stop each set with 2–3 reps left in the tank."
    : greatDay
      ? "Take the last set of each main lift close to failure."
      : "Leave about 1–2 reps in reserve on working sets.";

  const minutes = estimateMinutes(plan.map((s, i) => ({ ...slots[i]!, restSec: s.restSec })));
  return { slots, minutes, notes, effortCue };
}

/* ------------------------------------------------------- daily insights */

export interface Insight {
  id: string;
  tone: "good" | "warn" | "info";
  title: string;
  body: string;
  priority: number;
}

export interface InsightInput {
  now: Date;
  history: readonly Workout[];
  /** Sets per muscle over the last 7 days. */
  volume: ReadonlyMap<string, { effectiveSets: number }>;
  targets: readonly VolumeTarget[];
  /** Muscles the next session trains as a primary mover. */
  nextDayMuscles: readonly string[];
  nextDayLabel: string;
  eatenToday: Macros;
  macroTargets: Macros | null;
  /** Exercise slug -> working-set history (oldest first) for lifts in the program. */
  liftHistory: ReadonlyMap<string, SessionResult[]>;
  names: { muscle: (slug: string) => string; exercise: (slug: string) => string };
}

const DAY = 86_400_000;

export function dailyInsights(x: InsightInput, max = 3): Insight[] {
  const out: Insight[] = [];
  const last = x.history.at(-1);
  const daysOff = last ? Math.floor((startOfDay(x.now) - startOfDay(new Date(last.startedAt))) / DAY) : null;

  if (daysOff === null) {
    out.push({ id: "first", tone: "info", priority: 90, title: "Your first session is ready", body: `${x.nextDayLabel} is set up for your goals. Take the first one easy and log honestly. I'll set your weights from there.` });
  } else if (daysOff >= 4) {
    out.push({ id: "comeback", tone: "warn", priority: 85, title: `${daysOff} days since your last workout`, body: "A short session still counts. Do the main lifts today and skip the rest if you need to." });
  }

  const behind = x.targets
    .map((t) => ({ m: t.muscle, gap: t.minSets - (x.volume.get(t.muscle)?.effectiveSets ?? 0) }))
    .filter((b) => b.gap > 0)
    .sort((a, b) => b.gap - a.gap);
  const coveredToday = behind.filter((b) => x.nextDayMuscles.includes(b.m));
  if (behind.length && x.history.length) {
    const names = coveredToday.slice(0, 3).map((b) => x.names.muscle(b.m).toLowerCase());
    out.push({
      id: "behind",
      tone: "warn",
      priority: 70 + Math.min(10, behind.length),
      title: `${behind.length} muscle${behind.length === 1 ? " is" : "s are"} behind this week`,
      body: names.length
        ? `${x.nextDayLabel} trains ${list(names)}, which closes part of the gap.`
        : `Most behind: ${list(behind.slice(0, 3).map((b) => x.names.muscle(b.m).toLowerCase()))}. Add 2–3 sets for them where you can.`,
    });
  } else if (x.history.length && !behind.length) {
    out.push({ id: "on-target", tone: "good", priority: 50, title: "Every muscle is on target", body: "You've hit the minimum weekly sets for every tracked muscle. Keep the rhythm." });
  }

  for (const [slug, h] of x.liftHistory) {
    if (isStalled(h)) {
      out.push({
        id: `stall-${slug}`,
        tone: "warn",
        priority: 75,
        title: `${x.names.exercise(slug)} has stalled`,
        body: "Three sessions without progress. Drop the weight about 10% and build back up, or ask me for a swap.",
      });
      break;
    }
  }

  const weekAgo = x.now.getTime() - 7 * DAY;
  for (let i = x.history.length - 1; i >= 0; i--) {
    const w = x.history[i]!;
    if (new Date(w.startedAt).getTime() < weekAgo) break;
    const prs = findRecords(w, x.history.slice(0, i));
    if (prs.length) {
      const pr = prs[0]!;
      out.push({
        id: "pr",
        tone: "good",
        priority: 65,
        title: `New record: ${x.names.exercise(pr.exercise)}`,
        body: pr.kind === "e1rm" ? `${pr.set}, an estimated 1RM of ${pr.value} kg${pr.previous ? `, up from ${pr.previous}` : ""}.` : `${pr.set}${pr.previous ? `, up from ${pr.previous}` : ""}.`,
      });
      break;
    }
  }

  if (x.macroTargets && x.now.getHours() >= 14) {
    const left = Math.round(x.macroTargets.protein - x.eatenToday.protein);
    if (left > x.macroTargets.protein * 0.5) {
      out.push({ id: "protein", tone: "warn", priority: 60, title: `${left} g protein to go today`, body: "Plan a protein-heavy dinner, or add a shake (about 25 g per scoop)." });
    }
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, max);
}

/* --------------------------------------------------------- weekly review */

export interface WeeklyReview {
  sessions: number;
  plannedSessions: number;
  musclesOnTarget: number;
  musclesTracked: number;
  avgCalories: number | null;
  calorieTarget: number | null;
  daysLogged: number;
  headline: string;
}

export function weeklyReview(input: {
  sessions: number;
  plannedSessions: number;
  volume: ReadonlyMap<string, { effectiveSets: number }>;
  targets: readonly VolumeTarget[];
  dailyCalories: readonly number[];
  calorieTarget: number | null;
}): WeeklyReview {
  const onTarget = input.targets.filter((t) => (input.volume.get(t.muscle)?.effectiveSets ?? 0) >= t.minSets).length;
  const logged = input.dailyCalories.filter((c) => c > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : null;
  const adherence = input.plannedSessions ? input.sessions / input.plannedSessions : 0;
  const extra = input.sessions - input.plannedSessions;
  const headline =
    adherence >= 1 && onTarget === input.targets.length
      ? "A complete week. Every session done and every muscle on target."
      : adherence >= 1
        ? `All ${input.plannedSessions} planned sessions done${extra > 0 ? `, plus ${extra} extra` : ""}. ${input.targets.length - onTarget} muscle${input.targets.length - onTarget === 1 ? " is" : "s are"} still under target.`
        : adherence >= 0.75
          ? `Solid week: ${input.sessions} of ${input.plannedSessions} sessions.`
          : `${input.sessions} of ${input.plannedSessions} sessions. Next week, protect your main-lift days first.`;
  return {
    sessions: input.sessions,
    plannedSessions: input.plannedSessions,
    musclesOnTarget: onTarget,
    musclesTracked: input.targets.length,
    avgCalories: avg,
    calorieTarget: input.calorieTarget,
    daysLogged: logged.length,
    headline,
  };
}

/* --------------------------------------------------------------- safety */

export type RedFlag = "cardiac" | "injury" | "eating";

const RED_FLAGS: [RedFlag, RegExp][] = [
  ["cardiac", /\b(chest (pain|tight\w*|pressure)|faint(ed|ing)?|pass(ed)? out|black(ed)? out|heart (racing|palpitations?)|can'?t breathe|short(ness)? of breath)\b/i],
  ["injury", /\b(heard a pop|felt a pop|sharp pain|shooting pain|numb(ness)?|tingling|can'?t (move|bear weight)|swollen|dislocat\w*)\b/i],
  ["eating", /\b(purg\w*|make myself (throw up|vomit)|starv(e|ing) myself|eat(ing)? nothing|under 800 cal\w*|binge\w*)\b/i],
];

/** Messages that need a safety response before any coaching. */
export function detectRedFlag(text: string): RedFlag | null {
  for (const [flag, re] of RED_FLAGS) if (re.test(text)) return flag;
  return null;
}

export const RED_FLAG_REPLY: Record<RedFlag, string> = {
  cardiac: "Stop training now. Chest pain, fainting or trouble breathing need medical attention. If it's severe or not easing, call your local emergency number. Once a doctor has cleared you, I'll help you ease back in.",
  injury: "Stop loading that area today. A pop, sharp or shooting pain, numbness or swelling should be checked by a doctor or physiotherapist before you train it again. I can rearrange your plan to work around it in the meantime.",
  eating: "Thank you for telling me. I'm not the right support for this, and you deserve real help. Please talk to a doctor or an eating disorder helpline in your country. I'll keep your training gentle and won't push calorie cuts.",
};

/* -------------------------------------------------------------- helpers */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
