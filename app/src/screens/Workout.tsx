import { useEffect, useMemo, useState } from "react";
import { defaultRestSec } from "../../../src/domain/template";
import type { Workout as LoggedWorkout } from "../../../src/domain/types";
import {
  dayByKey,
  exerciseHistory,
  exerciseName,
  suggestionFor,
  techniqueName,
  uid,
  type ActiveSession,
  type DraftExercise,
  type DraftSet,
} from "../store";
import { Icon } from "../ui/Icon";
import { Ring } from "../ui/Ring";
import { SLOT_LABEL } from "./Today";

interface Props {
  session: ActiveSession;
  history: LoggedWorkout[];
  onChange: (s: ActiveSession) => void;
  onMinimize: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onCoach: (prompt?: string) => void;
}

export function Workout({ session, history, onChange, onMinimize, onFinish, onDiscard, onCoach }: Props) {
  const [coachOpen, setCoachOpen] = useState(true);
  const day = dayByKey(session.dayKey);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const now = useNow(1000);

  const totals = useMemo(() => {
    const all = session.exercises.flatMap((e) => e.sets);
    return { done: all.filter((s) => s.done).length, total: all.length };
  }, [session]);

  const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && restLeft === 0) {
      try {
        navigator.vibrate?.([120, 80, 120]);
      } catch {
        /* vibration unsupported */
      }
      const t = setTimeout(() => setRest(null), 1200);
      return () => clearTimeout(t);
    }
  }, [rest, restLeft]);

  useWakeLock();

  const updateExercise = (id: string, fn: (e: DraftExercise) => DraftExercise) =>
    onChange({ ...session, exercises: session.exercises.map((e) => (e.id === id ? fn(e) : e)) });

  const updateSet = (exId: string, setId: string, patch: Partial<DraftSet>) =>
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

  return (
    <div className="workout" role="dialog" aria-label={`${day.label} workout`}>
      <header className="wk-nav">
        <button className="icon-btn" onClick={onMinimize} aria-label="Minimize workout">
          <Icon name="chevronDown" />
        </button>
        <div className="wk-nav-title">
          <span className="wk-nav-name">{day.label}</span>
          <span className="wk-nav-time">{clock(elapsed)}</span>
        </div>
        <button className="btn-pill" onClick={() => setConfirming(true)}>
          Finish
        </button>
      </header>
      <div className="wk-progress" aria-hidden="true">
        <span style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} />
      </div>

      <div className="wk-scroll">
        {coachOpen && (session.coachNotes?.length || session.effortCue) ? (
          <section className="coach-banner" aria-label="Coach notes">
            <span className="coach-avatar" aria-hidden="true">
              <Icon name="sparkle" size={16} stroke={2.2} />
            </span>
            <div className="coach-banner-text">
              {session.coachNotes?.map((n, i) => <p key={i}>{n}</p>)}
              {session.effortCue && <p className="coach-cue">{session.effortCue}</p>}
              <button className="link-btn" onClick={() => onCoach()}>
                Ask coach <Icon name="chevron" size={14} />
              </button>
            </div>
            <button className="row-del" onClick={() => setCoachOpen(false)} aria-label="Hide coach notes">
              <Icon name="close" size={14} />
            </button>
          </section>
        ) : (
          <button className="coach-pill" onClick={() => onCoach()}>
            <Icon name="sparkle" size={15} /> Ask coach mid-workout
          </button>
        )}
        {session.exercises.map((ex) => {
          const slot = day.slots[ex.slotIndex]!;
          const prev = exerciseHistory(history, ex.exercise).at(-1);
          const suggestion = suggestionFor(history, slot);
          const repsHint = slot.reps ? (slot.reps.min === slot.reps.max ? `${slot.reps.max}` : `${slot.reps.min}–${slot.reps.max}`) : "max";
          const allDone = ex.sets.every((s) => s.done);
          return (
            <article className={`wk-card${allDone ? " is-done" : ""}`} key={ex.id}>
              <div className="wk-card-head">
                <span className={`slot-badge slot-${slot.slotType}`}>{SLOT_LABEL[slot.slotType]}</span>
                <h3>{exerciseName(ex.exercise)}</h3>
                <p className="wk-presc">
                  {slot.sets.min === slot.sets.max ? slot.sets.max : `${slot.sets.min}–${slot.sets.max}`} sets × {repsHint}
                  {" · "}
                  {effortLabel(slot.effort, slot.rir)}
                  {" · "}rest {Math.round(defaultRestSec(slot) / 15) * 15}s
                  {slot.technique && <> · {techniqueName(slot.technique)}</>}
                </p>
                {suggestion && (
                  <p className={`suggest suggest-${suggestion.action}`}>
                    <Icon name={suggestion.action === "increase" ? "arrowUp" : suggestion.action === "deload" ? "arrowDown" : "equal"} size={14} stroke={2.4} />
                    <strong>{suggestion.weight > 0 ? `${suggestion.weight} kg` : "Bodyweight"}</strong>
                    <span>{suggestion.reason}</span>
                  </p>
                )}
              </div>

              <div className="set-grid set-head" aria-hidden="true">
                <span>Set</span>
                <span>Previous</span>
                <span>kg</span>
                <span>Reps</span>
                <span />
              </div>
              {ex.sets.map((set, i) => {
                const p = prev?.sets[i];
                return (
                  <div key={set.id} className={`set-block${set.done ? " done" : ""}`}>
                    <div className="set-grid">
                      <span className="set-no">{slot.slotType === "primer" ? "P" : i + 1}</span>
                      <span className="set-prev">{p ? `${p.weight || "BW"} × ${p.reps}` : "—"}</span>
                      <input
                        id={`w-${set.id}`}
                        className="set-input"
                        inputMode="decimal"
                        aria-label={`Set ${i + 1} weight in kilograms`}
                        placeholder={p?.weight ? String(p.weight) : "BW"}
                        value={set.weight}
                        onChange={(e) => updateSet(ex.id, set.id, { weight: e.target.value.replace(/[^\d.]/g, "") })}
                      />
                      <input
                        id={`r-${set.id}`}
                        className="set-input"
                        inputMode="numeric"
                        aria-label={`Set ${i + 1} reps`}
                        placeholder={suggestion?.targetReps ? String(suggestion.targetReps) : repsHint}
                        value={set.reps}
                        onChange={(e) => updateSet(ex.id, set.id, { reps: e.target.value.replace(/\D/g, "") })}
                      />
                      <button
                        className={`tick${set.done ? " on" : ""}`}
                        aria-pressed={set.done}
                        aria-label={set.done ? `Mark set ${i + 1} not done` : `Complete set ${i + 1}`}
                        onClick={() => {
                          const done = !set.done;
                          const reps = set.reps || (done ? (suggestion?.targetReps ? String(suggestion.targetReps) : slot.reps ? String(slot.reps.max) : "") : "");
                          const weight = set.weight || (done && p?.weight ? String(p.weight) : set.weight);
                          updateSet(ex.id, set.id, { done, reps, weight });
                          if (done) {
                            const total = defaultRestSec(slot);
                            setRest({ endsAt: Date.now() + total * 1000, total });
                          }
                        }}
                      >
                        <Icon name="check" size={18} stroke={2.6} />
                      </button>
                    </div>
                    {set.done && slot.finishers.length > 0 && (
                      <div className="segments">
                        {slot.finishers.map((f) => {
                          const n = set.segments[f] ?? 0;
                          return (
                            <div className="segment" key={f}>
                              <span className="segment-name">+ {techniqueName(f)}</span>
                              <div className="stepper">
                                <button
                                  aria-label={`Fewer ${techniqueName(f)}`}
                                  disabled={n === 0}
                                  onClick={() => updateSet(ex.id, set.id, { segments: { ...set.segments, [f]: Math.max(0, n - 1) } })}
                                >
                                  <Icon name="minus" size={14} stroke={2.6} />
                                </button>
                                <span className="stepper-val">{n}</span>
                                <button
                                  aria-label={`More ${techniqueName(f)}`}
                                  onClick={() => updateSet(ex.id, set.id, { segments: { ...set.segments, [f]: n + 1 } })}
                                >
                                  <Icon name="plus" size={14} stroke={2.6} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                className="add-set"
                onClick={() =>
                  updateExercise(ex.id, (e) => ({
                    ...e,
                    sets: [...e.sets, { id: uid(), weight: e.sets.at(-1)?.weight ?? "", reps: "", done: false, segments: {} }],
                  }))
                }
              >
                <Icon name="plus" size={16} stroke={2.4} /> Add set
              </button>
            </article>
          );
        })}
        <p className="wk-foot muted small">
          {totals.done} of {totals.total} sets done. Primer sets don't count toward weekly volume.
        </p>
      </div>

      {rest && (
        <div className="rest" role="status" aria-live="polite">
          <Ring value={restLeft / rest.total} size={44} width={5} color="var(--rest)" track="var(--rest-track)" />
          <div className="rest-text">
            <span className="rest-label">{restLeft === 0 ? "Go" : "Rest"}</span>
            <span className="rest-time">{clock(restLeft)}</span>
          </div>
          <button className="rest-btn" onClick={() => setRest((r) => r && { endsAt: r.endsAt + 15000, total: r.total + 15 })}>
            +15s
          </button>
          <button className="rest-btn" onClick={() => setRest(null)}>
            Skip
          </button>
        </div>
      )}

      {confirming && (
        <div className="sheet-backdrop" onClick={() => setConfirming(false)}>
          <div className="sheet" role="dialog" aria-label="Finish workout" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grabber" aria-hidden="true" />
            <h3>Finish {day.label}?</h3>
            <p className="muted">
              {totals.done} {totals.done === 1 ? "set" : "sets"} logged in {clock(elapsed)}. Unticked sets are left out.
            </p>
            <button className="btn-primary" disabled={totals.done === 0} onClick={onFinish}>
              Save workout
            </button>
            <button className="btn-plain danger" onClick={onDiscard}>
              Discard workout
            </button>
            <button className="btn-plain" onClick={() => setConfirming(false)}>
              Keep training
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function effortLabel(effort: string, rir?: number) {
  switch (effort) {
    case "sub_max":
      return "easy, sub-max";
    case "rir":
      return `${rir ?? 2} reps in reserve`;
    case "form_failure":
      return "to form failure";
    default:
      return "to failure";
  }
}

export function clock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Keep the screen on while logging; silently ignored where unsupported. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);
}
