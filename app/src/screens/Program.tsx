import { useMemo, useState } from "react";
import { TEMPLATES, templateBySlug } from "../../../src/data/templates";
import { swapOptions, type PersonalizedSlot } from "../../../src/domain/personalize";
import { checkPlan, projectWeek } from "../../../src/domain/planner";
import { catalog, dayByKey, exerciseName, muscleName, nextDayKey, program, targetsFor, techniqueName, type AppState } from "../store";
import { Icon } from "../ui/Icon";
import { fmt, SLOT_LABEL } from "./Today";

interface Props {
  state: AppState;
  onStart: (dayKey: string) => void;
  onChangeProgram: (slug: string) => void;
  onSwap: (dayKey: string, baseIndex: number, exercise: string | null) => void;
}

export function Program({ state, onStart, onChangeProgram, onSwap }: Props) {
  const upNext = state.active?.dayKey ?? nextDayKey(state.history);
  const [picked, setSelected] = useState(upNext);
  const selected = program.days.some((d) => d.key === picked) ? picked : upNext;
  const day = dayByKey(selected);
  const [sheet, setSheet] = useState<"programs" | { slot: PersonalizedSlot } | null>(null);
  const equipment = state.profile?.equipment ?? "gym";
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
        <button className="btn-small" onClick={() => setSheet("programs")} disabled={!!state.active}>
          Change
        </button>
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
                <button className="row-btn row-top" onClick={() => setSheet({ slot })} aria-label={`Swap ${exerciseName(slot.exercise)}`}>
                <span className={`slot-badge slot-${slot.slotType}`}>{SLOT_LABEL[slot.slotType]}</span>
                <span className="row-text">
                  <span className="row-title">
                    {exerciseName(slot.exercise)}
                    {slot.change && (
                      <span className={`change-tag change-${slot.change}`}>
                        {slot.change === "swap" ? "Your pick" : slot.change === "equipment" ? "For your equipment" : "+1 set focus"}
                      </span>
                    )}
                  </span>
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
                <Icon name="swap" size={18} className="row-chevron" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="muted small footnote">Tap an exercise to swap it for one that suits you.</p>
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

      {sheet === "programs" && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet sheet-tall" role="dialog" aria-label="Choose a program" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grabber" aria-hidden="true" />
            <h3>Choose a program</h3>
            <p className="muted">Your exercise swaps reset when you switch. Logged workouts stay.</p>
            <div className="plan-cards">
              {TEMPLATES.map((t) => (
                <button
                  key={t.slug}
                  className={`plan-card${program.slug === t.slug ? " on" : ""}`}
                  aria-pressed={program.slug === t.slug}
                  onClick={() => {
                    if (t.slug !== program.slug) onChangeProgram(t.slug);
                    setSheet(null);
                  }}
                >
                  <span className="plan-card-top">
                    <strong>{t.name}</strong>
                    {program.slug === t.slug && <span className="pill">Current</span>}
                  </span>
                  <span className="plan-card-body">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet && sheet !== "programs" && (
        <SwapSheet
          slot={sheet.slot}
          dayKey={day.key}
          equipment={equipment}
          onClose={() => setSheet(null)}
          onPick={(exercise) => {
            onSwap(day.key, sheet.slot.baseIndex, exercise);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function SwapSheet({
  slot,
  dayKey,
  equipment,
  onClose,
  onPick,
}: {
  slot: PersonalizedSlot;
  dayKey: string;
  equipment: "gym" | "dumbbells" | "home";
  onClose: () => void;
  onPick: (exercise: string | null) => void;
}) {
  const base = templateBySlug(program.slug)!.days.find((d) => d.key === dayKey)!.slots[slot.baseIndex]!;
  const options = swapOptions(base, catalog.exercises, equipment);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" role="dialog" aria-label="Swap exercise" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" aria-hidden="true" />
        <h3>Swap {exerciseName(slot.exercise)}</h3>
        <p className="muted">Same movement and muscles, so your plan stays balanced.</p>
        <ul className="list card">
          {options.map((o) => (
            <li className="row" key={o.slug}>
              <button className="row-btn" onClick={() => onPick(o.slug === base.exercise ? null : o.slug)}>
                <span className="row-text">
                  <span className="row-title">
                    {o.name}
                    {o.slug === base.exercise && <span className="change-tag">Program default</span>}
                  </span>
                  <span className="row-sub">{o.equipment.join(", ").replace(/_/g, " ")}</span>
                </span>
                {o.slug === slot.exercise && <Icon name="check" size={18} stroke={2.6} className="text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
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
