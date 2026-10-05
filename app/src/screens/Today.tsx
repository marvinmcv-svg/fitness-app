import { useMemo } from "react";
import { dailyInsights } from "../../../src/domain/coach";
import { sumMacros } from "../../../src/domain/nutrition";
import type { SessionResult } from "../../../src/domain/progression";
import {
  catalog,
  dayByKey,
  exerciseHistory,
  program,
  targetsMacros,
  exerciseName,
  muscleName,
  nextDayKey,
  rollingVolume,
  targetsFor,
  techniqueName,
  type AppState,
} from "../store";
import { Icon } from "../ui/Icon";
import { Ring } from "../ui/Ring";
import { initials } from "./Profile";

export const SLOT_LABEL = { warmup: "Warm-up", primer: "Primer", corrective: "Corrective", main: "Main", accessory: "Accessory", burnout: "Burnout" } as const;

interface Props {
  state: AppState;
  onStart: (dayKey: string) => void;
  onResume: () => void;
  onProfile: () => void;
  onCoach: (prompt?: string) => void;
}

export function Today({ state, onStart, onResume, onProfile, onCoach }: Props) {
  const targets = targetsFor(state.preset);
  const { volume, workouts } = rollingVolume(state.history);
  const dayKey = state.active?.dayKey ?? nextDayKey(state.history);
  const day = dayByKey(dayKey);
  const workingSlots = day.slots.filter((s) => s.slotType !== "primer");
  const plannedSets = workingSlots.reduce((n, s) => n + s.sets.max, 0);

  const goalTotal = targets.reduce((n, t) => n + t.minSets, 0);
  const doneTotal = targets.reduce((n, t) => n + Math.min(t.minSets, volume.get(t.muscle)?.effectiveSets ?? 0), 0);
  const weekPct = goalTotal ? doneTotal / goalTotal : 0;
  const insights = useMemo(() => {
    const now = new Date();
    const lifts = new Map<string, SessionResult[]>();
    for (const d of program.days) for (const sl of d.slots) if (sl.slotType === "main") lifts.set(sl.exercise, exerciseHistory(state.history, sl.exercise));
    return dailyInsights({
      now,
      history: state.history,
      volume,
      targets,
      nextDayMuscles: [...new Set(day.slots.flatMap((sl) => catalog.exercises.get(sl.exercise)?.muscles.filter((m) => m.role === "primary").map((m) => m.muscle) ?? []))],
      nextDayLabel: day.label,
      eatenToday: sumMacros(state.food.filter((f) => new Date(f.eatenAt).toDateString() === now.toDateString()).map((f) => f.macros)),
      macroTargets: targetsMacros(state.profile),
      liftHistory: lifts,
      names: { muscle: (m) => muscleName.get(m) ?? m, exercise: exerciseName },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history, state.food, state.profile, state.preset, dayKey]);

  const firstName = (state.profile?.name || state.account?.name || "").split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">{dateLabel}</p>
          <h1>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <button className="avatar" onClick={onProfile} aria-label="Profile and settings">
          {(state.profile?.name || state.account?.name) ? initials(state.profile?.name || state.account?.name || "") : <Icon name="person" size={20} />}
        </button>
      </header>

      <section className="hero" aria-label="Next workout">
        <div className="hero-body">
          <p className="hero-kicker">{state.active ? "In progress" : "Up next"}</p>
          <h2 className="hero-title">{day.label}</h2>
          <p className="hero-meta">
            {workingSlots.length} exercises · {plannedSets} working sets · ~{Math.round(plannedSets * 2.6 + 8)} min
          </p>
          <button className="btn-hero" onClick={() => (state.active ? onResume() : onStart(dayKey))}>
            <Icon name="play" size={16} />
            {state.active ? "Resume workout" : "Start workout"}
          </button>
        </div>
        <Ring value={weekPct} size={104} width={10} color="var(--hero-accent)" track="var(--hero-track)">
          <span className="hero-pct">{Math.round(weekPct * 100)}%</span>
          <span className="hero-pct-sub">of weekly goal</span>
        </Ring>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Last 7 days</h3>
          <span className="pill">{workouts.length} sessions</span>
        </div>
        <div className="ring-scroller" role="list">
          {targets.map((t) => {
            const v = volume.get(t.muscle);
            const sets = v?.effectiveSets ?? 0;
            const left = Math.max(0, t.minSets - sets);
            const tone = sets > t.maxSets ? "var(--warn)" : sets >= t.minSets ? "var(--good)" : "var(--accent)";
            return (
              <div className="ring-card" role="listitem" key={t.muscle}>
                <p className="ring-card-title">{muscleName.get(t.muscle)}</p>
                <Ring value={sets / t.minSets} size={76} width={8} color={tone}>
                  <span className="ring-num">{fmt(sets)}</span>
                  <span className="ring-den">/{t.minSets}</span>
                </Ring>
                <p className="ring-card-foot">
                  {left > 0 ? `${fmt(left)} ${left === 1 ? "set" : "sets"} left` : sets > t.maxSets ? "Above range" : "Target met"}
                </p>
                <p className="ring-card-freq">
                  {Array.from({ length: Math.max(t.minFrequency, v?.sessions ?? 0) }, (_, i) => (
                    <span key={i} className={i < (v?.sessions ?? 0) ? "dot on" : "dot"} />
                  ))}
                  <span className="sr-only">{v?.sessions ?? 0} sessions</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card coach-brief" aria-label="Coach brief">
        <div className="coach-brief-head">
          <span className="coach-avatar" aria-hidden="true">
            <Icon name="sparkle" size={18} stroke={2.2} />
          </span>
          <div>
            <p className="coach-brief-title">Coach</p>
            <p className="muted small">Your brief for today</p>
          </div>
          <button className="btn-small accent" onClick={() => onCoach()}>
            Ask
          </button>
        </div>
        <ul className="insights">
          {insights.map((i) => (
            <li key={i.id} className={`insight tone-${i.tone}`}>
              <strong>{i.title}</strong>
              <span>{i.body}</span>
            </li>
          ))}
          {!insights.length && (
            <li className="insight tone-info">
              <strong>All set for {day.label}</strong>
              <span>Tap Start and I'll check in on your sleep, energy and time first.</span>
            </li>
          )}
        </ul>
        {insights[0] && (
          <button className="link-btn" onClick={() => onCoach(`About "${insights[0]!.title}": what should I do?`)}>
            Ask about this <Icon name="chevron" size={16} />
          </button>
        )}
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Today's plan</h3>
          <span className="muted small">Rest timer starts when you tick a set</span>
        </div>
        <ul className="list card">
          {day.slots.map((slot, i) => (
            <li className="row" key={i}>
              <span className={`slot-badge slot-${slot.slotType}`}>{SLOT_LABEL[slot.slotType]}</span>
              <span className="row-text">
                <span className="row-title">{exerciseName(slot.exercise)}</span>
                <span className="row-sub">
                  {slot.sets.min === slot.sets.max ? slot.sets.max : `${slot.sets.min}–${slot.sets.max}`} ×{" "}
                  {slot.reps ? (slot.reps.min === slot.reps.max ? slot.reps.max : `${slot.reps.min}–${slot.reps.max}`) : "failure"}
                  {slot.technique ? ` · ${techniqueName(slot.technique)}` : ""}
                  {slot.finishers.length ? ` · + ${slot.finishers.map(techniqueName).join(", ").toLowerCase()}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
