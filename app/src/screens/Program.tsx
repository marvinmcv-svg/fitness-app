import { useMemo, useState } from "react";
import { checkPlan, projectWeek } from "../../../src/domain/planner";
import { catalog, dayByKey, exerciseName, muscleName, nextDayKey, program, targetsFor, techniqueName, type AppState } from "../store";
import { Icon } from "../ui/Icon";
import { fmt, SLOT_LABEL } from "./Today";

export function Program({ state, onStart }: { state: AppState; onStart: (dayKey: string) => void }) {
  const upNext = state.active?.dayKey ?? nextDayKey(state.history);
  const [selected, setSelected] = useState(upNext);
  const day = dayByKey(selected);
  const targets = targetsFor(state.preset);

  const { planned, warnings } = useMemo(() => {
    const planned = projectWeek(program, catalog.exercises);
    return { planned, warnings: checkPlan(planned, targets) };
  }, [targets]);

  return (
    <div className="screen">
      <header className="large-title compact">
        <div className="lt-text">
          <p className="eyebrow">Your program</p>
          <h1>{program.name}</h1>
        </div>
      </header>

      <div className="day-strip" role="tablist" aria-label="Training days">
        {program.weekLayout.map((key, i) => {
          const d = dayByKey(key);
          const [focus, variant] = splitLabel(d.label);
          return (
            <button
              key={key}
              role="tab"
              aria-selected={key === selected}
              className={`day-chip${key === selected ? " on" : ""}`}
              onClick={() => setSelected(key)}
            >
              <span className="day-chip-n">Day {i + 1}</span>
              <span className="day-chip-focus">{focus}</span>
              <span className="day-chip-var">{variant}</span>
              {key === upNext && <span className="day-chip-next">Next</span>}
            </button>
          );
        })}
      </div>

      <section className="group">
        <div className="group-head">
          <h3>{day.label}</h3>
          <button className="link-btn" onClick={() => onStart(selected)} disabled={!!state.active}>
            {state.active ? "Workout in progress" : "Start this day"}
            {!state.active && <Icon name="chevron" size={16} />}
          </button>
        </div>
        <ul className="list card">
          {day.slots.map((slot, i) => {
            const ex = catalog.exercises.get(slot.exercise)!;
            return (
              <li className="row row-top" key={i}>
                <span className={`slot-badge slot-${slot.slotType}`}>{SLOT_LABEL[slot.slotType]}</span>
                <span className="row-text">
                  <span className="row-title">{exerciseName(slot.exercise)}</span>
                  <span className="row-sub">
                    {slot.sets.min === slot.sets.max ? slot.sets.max : `${slot.sets.min}–${slot.sets.max}`} ×{" "}
                    {slot.reps ? (slot.reps.min === slot.reps.max ? slot.reps.max : `${slot.reps.min}–${slot.reps.max}`) : "failure"}
                    {slot.progression ? ` · ${progressionLabel(slot.progression.type)}` : ""}
                  </span>
                  <span className="tags">
                    {ex.muscles
                      .filter((m) => m.role === "primary")
                      .map((m) => (
                        <span className="tag" key={m.muscle}>
                          {muscleName.get(m.muscle)}
                        </span>
                      ))}
                    {slot.technique && <span className="tag tag-tech">{techniqueName(slot.technique)}</span>}
                    {slot.finishers.map((f) => (
                      <span className="tag tag-tech" key={f}>
                        + {techniqueName(f)}
                      </span>
                    ))}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Weekly plan check</h3>
          <span className={`pill ${warnings.length ? "pill-warn" : "pill-good"}`}>
            {warnings.length ? `${warnings.length} to review` : "All targets covered"}
          </span>
        </div>
        {warnings.length > 0 && (
          <ul className="list card">
            {warnings.map((w, i) => (
              <li className="row" key={i}>
                <span className="row-icon tone-warn">
                  <Icon name="warning" size={18} />
                </span>
                <span className="row-text">
                  <span className="row-title">{muscleName.get(w.muscle)}</span>
                  <span className="row-sub">
                    {w.kind === "below_target" && `Plans at most ${fmt(w.planned)} sets a week; your minimum is ${w.target}.`}
                    {w.kind === "above_target" && `Plans at least ${fmt(w.planned)} sets a week; your maximum is ${w.target}.`}
                    {w.kind === "low_frequency" && `Trained ${w.planned}× a week; your target is ${w.target}×.`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="card plan-table" role="table" aria-label="Planned weekly sets per muscle">
          <div className="plan-row plan-head" role="row">
            <span role="columnheader">Muscle</span>
            <span role="columnheader">Sets / week</span>
            <span role="columnheader">Days</span>
          </div>
          {targets.map((t) => {
            const p = planned.get(t.muscle);
            const lo = p?.minSets ?? 0;
            const hi = p?.maxSets ?? 0;
            const ok = hi >= t.minSets && lo <= t.maxSets;
            return (
              <div className="plan-row" role="row" key={t.muscle}>
                <span role="cell">{muscleName.get(t.muscle)}</span>
                <span role="cell" className="num">
                  <span className={ok ? "" : "text-warn"}>{lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`}</span>
                  <span className="muted"> / {t.minSets}–{t.maxSets}</span>
                </span>
                <span role="cell" className="num">
                  {p?.frequency ?? 0}×
                </span>
              </div>
            );
          })}
        </div>
        <p className="muted small footnote">Secondary muscles count as half a set. Primer work is excluded.</p>
      </section>
    </div>
  );
}

function splitLabel(label: string): [string, string] {
  const m = label.match(/^(.*)\s([AB])$/);
  return m ? [m[1]!.replace(" + ", " & "), `Variation ${m[2]}`] : [label, ""];
}

function progressionLabel(type: string) {
  return type === "double_progression" ? "double progression" : type === "linear" ? "linear +load" : "beat your reps";
}
