import { useMemo, useState } from "react";
import { adjustSession, estimateMinutes, findRecords, type PlannedSlot, type Readiness } from "../../../src/domain/coach";
import { defaultRestSec } from "../../../src/domain/template";
import type { Workout as LoggedWorkout } from "../../../src/domain/types";
import { catalog, dayByKey, dayLabel, exerciseName, muscleName, nextDayKey, tonnage, workingSets } from "../store";
import { Icon } from "../ui/Icon";

export function plannedSlots(dayKey: string): PlannedSlot[] {
  return dayByKey(dayKey).slots.map((s) => ({
    slotType: s.slotType,
    exercise: s.exercise,
    primaryMuscles: catalog.exercises.get(s.exercise)?.muscles.filter((m) => m.role === "primary").map((m) => m.muscle) ?? [],
    sets: s.sets,
    restSec: defaultRestSec(s),
  }));
}

const SORE_CHOICES = ["chest", "upper_back", "lats", "side_delts", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "spinal_erectors"];

export function ReadinessSheet({ dayKey, onStart, onClose }: { dayKey: string; onStart: (r: Readiness | null) => void; onClose: () => void }) {
  const [r, setR] = useState<Readiness>({ sleep: "ok", energy: "normal", sore: [], minutes: null });
  const plan = useMemo(() => plannedSlots(dayKey), [dayKey]);
  const preview = useMemo(() => adjustSession(plan, r), [plan, r]);
  const full = estimateMinutes(plan.map((s) => ({ sets: s.sets.max, restSec: s.restSec })));
  const changed = preview.slots.some((s, i) => !s.keep || s.sets !== plan[i]!.sets.max);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" role="dialog" aria-label="Readiness check" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-top">
          <div>
            <p className="eyebrow">Coach check-in</p>
            <h3>How are you today?</h3>
          </div>
          <span className="coach-avatar" aria-hidden="true">
            <Icon name="sparkle" size={18} stroke={2.2} />
          </span>
        </div>

        <Choice label="Sleep last night" value={r.sleep} options={[["poor", "Poor"], ["ok", "OK"], ["great", "Great"]]} onChange={(sleep) => setR({ ...r, sleep })} />
        <Choice label="Energy" value={r.energy} options={[["low", "Low"], ["normal", "Normal"], ["high", "High"]]} onChange={(energy) => setR({ ...r, energy })} />

        <div className="check-group">
          <p className="check-label">Anything sore?</p>
          <div className="chip-grid">
            {SORE_CHOICES.map((m) => {
              const on = r.sore.includes(m);
              return (
                <button key={m} className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => setR({ ...r, sore: on ? r.sore.filter((x) => x !== m) : [...r.sore, m] })}>
                  {muscleName.get(m)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="check-group">
          <p className="check-label">Time you have</p>
          <div className="chip-grid">
            {[30, 45, 60, 75].map((m) => (
              <button key={m} className={`chip${r.minutes === m ? " on" : ""}`} aria-pressed={r.minutes === m} onClick={() => setR({ ...r, minutes: r.minutes === m ? null : m })}>
                {m} min
              </button>
            ))}
            <button className={`chip${r.minutes === null ? " on" : ""}`} aria-pressed={r.minutes === null} onClick={() => setR({ ...r, minutes: null })}>
              No limit
            </button>
          </div>
        </div>

        <div className={`coach-plan${changed ? " changed" : ""}`}>
          <p className="coach-plan-head">
            <Icon name="sparkle" size={15} /> {changed ? `Adjusted: about ${preview.minutes} min (planned ${full})` : `Full session, about ${full} min`}
          </p>
          {preview.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
          <p className="coach-cue">{preview.effortCue}</p>
        </div>

        <button className="btn-primary" onClick={() => onStart(r)}>
          {changed ? "Start adjusted workout" : "Start workout"}
        </button>
        <button className="btn-plain" onClick={() => onStart(null)}>
          Skip check-in
        </button>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="check-group">
      <p className="check-label">{label}</p>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorkoutSummary({
  workout,
  before,
  onClose,
  onAskCoach,
}: {
  workout: LoggedWorkout;
  before: LoggedWorkout[];
  onClose: () => void;
  onAskCoach: () => void;
}) {
  const records = findRecords(workout, before);
  const minutes = workout.endedAt ? Math.max(1, Math.round((+new Date(workout.endedAt) - +new Date(workout.startedAt)) / 60000)) : null;
  const next = nextDayKey([...before, workout]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" role="dialog" aria-label="Workout summary" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" aria-hidden="true" />
        <p className="eyebrow">Workout saved</p>
        <h3>{workout.programDayId ? dayLabel(workout.programDayId) : "Workout"} done</h3>
        <div className="macro-summary">
          <span>
            <strong>{workingSets(workout)}</strong>sets
          </span>
          <span>
            <strong>{(tonnage(workout) / 1000).toFixed(1)}</strong>tonnes
          </span>
          <span>
            <strong>{minutes ?? "—"}</strong>min
          </span>
          <span>
            <strong>{records.length}</strong>records
          </span>
        </div>
        {records.length > 0 && (
          <ul className="list card">
            {records.map((r) => (
              <li className="row" key={r.exercise}>
                <span className="row-icon tone-good">
                  <Icon name="bolt" size={18} />
                </span>
                <span className="row-text">
                  <span className="row-title">{exerciseName(r.exercise)}</span>
                  <span className="row-sub">
                    {r.set}
                    {r.kind === "e1rm" ? ` · est. 1RM ${r.value} kg` : ""}
                    {r.previous ? ` (was ${r.previous})` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          {records.length ? "Strong session. " : "Every session counts. "}
          Next up: <strong>{dayByKey(next).label}</strong>. Weights for it are already updated from today.
        </p>
        <button className="btn-primary" onClick={onAskCoach}>
          <Icon name="sparkle" size={16} /> Ask coach about this workout
        </button>
        <button className="btn-plain" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
