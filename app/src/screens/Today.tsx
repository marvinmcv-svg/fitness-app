import { remainingSets } from "../../../src/domain/planner";
import {
  dayByKey,
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

export const SLOT_LABEL = { warmup: "Warm-up", primer: "Primer", corrective: "Corrective", main: "Main", accessory: "Accessory", burnout: "Burnout" } as const;

export function Today({ state, onStart, onResume }: { state: AppState; onStart: (dayKey: string) => void; onResume: () => void }) {
  const targets = targetsFor(state.preset);
  const { volume, workouts } = rollingVolume(state.history);
  const dayKey = state.active?.dayKey ?? nextDayKey(state.history);
  const day = dayByKey(dayKey);
  const workingSlots = day.slots.filter((s) => s.slotType !== "primer");
  const plannedSets = workingSlots.reduce((n, s) => n + s.sets.max, 0);

  const goalTotal = targets.reduce((n, t) => n + t.minSets, 0);
  const doneTotal = targets.reduce((n, t) => n + Math.min(t.minSets, volume.get(t.muscle)?.effectiveSets ?? 0), 0);
  const weekPct = goalTotal ? doneTotal / goalTotal : 0;
  const behind = remainingSets(volume, targets).sort((a, b) => b.remaining - a.remaining);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">{dateLabel}</p>
          <h1>{greeting}</h1>
        </div>
        <div className="avatar" aria-label="Profile">MV</div>
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

      {behind.length > 0 && (
        <section className="group">
          <div className="group-head">
            <h3>Behind this week</h3>
          </div>
          <ul className="list card">
            {behind.slice(0, 3).map((b) => (
              <li className="row" key={b.muscle}>
                <span className="row-icon tone-warn">
                  <Icon name="bolt" size={18} />
                </span>
                <span className="row-text">
                  <span className="row-title">{muscleName.get(b.muscle)}</span>
                  <span className="row-sub">{fmt(b.remaining)} more {b.remaining === 1 ? "set" : "sets"} to reach your minimum</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
