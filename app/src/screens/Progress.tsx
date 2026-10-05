import { useMemo, useState } from "react";
import { dayByKey, muscleName, rollingVolume, targetsFor, tonnage, workingSets, type AppState } from "../store";
import { fmt } from "./Today";

export function Progress({ state }: { state: AppState }) {
  const [range, setRange] = useState<"this" | "last">("this");
  const targets = targetsFor(state.preset);
  const end = useMemo(() => {
    const d = new Date();
    if (range === "last") d.setDate(d.getDate() - 7);
    return d;
  }, [range]);
  const { volume, workouts } = rollingVolume(state.history, 7, end);
  const scaleMax = Math.max(targets[0]!.maxSets + 4, ...targets.map((t) => volume.get(t.muscle)?.effectiveSets ?? 0));

  const days = 21;
  const activity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const sets = state.history
        .filter((w) => sameDay(new Date(w.startedAt), d))
        .reduce((n, w) => n + workingSets(w), 0);
      return { d, sets };
    });
  }, [state.history]);
  const actMax = Math.max(20, ...activity.map((a) => a.sets));

  const totalSets = workouts.reduce((n, w) => n + workingSets(w), 0);
  const totalKg = workouts.reduce((n, w) => n + tonnage(w), 0);

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">Weekly volume</p>
          <h1>Progress</h1>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label="Range">
        <button role="tab" aria-selected={range === "this"} className={range === "this" ? "on" : ""} onClick={() => setRange("this")}>
          Last 7 days
        </button>
        <button role="tab" aria-selected={range === "last"} className={range === "last" ? "on" : ""} onClick={() => setRange("last")}>
          Previous 7 days
        </button>
      </div>

      <div className="stat-row">
        <div className="stat card">
          <span className="stat-label">Sessions</span>
          <span className="stat-value">{workouts.length}</span>
        </div>
        <div className="stat card">
          <span className="stat-label">Sets</span>
          <span className="stat-value">{totalSets}</span>
        </div>
        <div className="stat card">
          <span className="stat-label">Tonnage</span>
          <span className="stat-value">
            {(totalKg / 1000).toFixed(1)}
            <small> t</small>
          </span>
        </div>
      </div>

      <section className="group">
        <div className="group-head">
          <h3>Sets per muscle</h3>
          <span className="legend">
            <span className="legend-band" /> target {targets[0]!.minSets}–{targets[0]!.maxSets}
          </span>
        </div>
        <div className="card bars">
          {targets.map((t) => {
            const v = volume.get(t.muscle)?.effectiveSets ?? 0;
            const tone = v > t.maxSets ? "warn" : v >= t.minSets ? "good" : "under";
            return (
              <div className="bar-row" key={t.muscle}>
                <span className="bar-name">{muscleName.get(t.muscle)}</span>
                <div className="bar-track">
                  <span
                    className="bar-band"
                    style={{ left: `${(t.minSets / scaleMax) * 100}%`, width: `${((t.maxSets - t.minSets) / scaleMax) * 100}%` }}
                  />
                  <span className={`bar-fill bar-${tone}`} style={{ width: `${(v / scaleMax) * 100}%` }} />
                </div>
                <span className="bar-val num">{fmt(v)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Activity</h3>
          <span className="muted small">Working sets per day, last 3 weeks</span>
        </div>
        <div className="card activity">
          <div className="act-grid" aria-hidden="true">
            <span style={{ bottom: `${(10 / actMax) * 100}%` }} />
            <span style={{ bottom: `${(20 / actMax) * 100}%` }} />
          </div>
          <div className="act-bars" role="img" aria-label="Bar chart of working sets per day over the last 21 days">
            {activity.map((a, i) => (
              <div className="act-col" key={i}>
                <span
                  className={`act-bar${i === activity.length - 1 ? " today" : ""}${a.sets === 0 ? " rest" : ""}`}
                  style={{ height: `${Math.max(3, (a.sets / actMax) * 100)}%` }}
                  title={`${a.d.toLocaleDateString()}: ${a.sets} sets`}
                />
                <span className="act-lbl">{i % 7 === 6 || i === activity.length - 1 ? a.d.toLocaleDateString(undefined, { weekday: "narrow" }) : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Recent workouts</h3>
        </div>
        <ul className="list card">
          {[...state.history]
            .reverse()
            .slice(0, 6)
            .map((w) => (
              <li className="row" key={w.id}>
                <span className="date-chip">
                  <span>{new Date(w.startedAt).toLocaleDateString(undefined, { month: "short" })}</span>
                  <strong>{new Date(w.startedAt).getDate()}</strong>
                </span>
                <span className="row-text">
                  <span className="row-title">{w.programDayId ? dayByKey(w.programDayId).label : "Freestyle"}</span>
                  <span className="row-sub">
                    {workingSets(w)} sets · {(tonnage(w) / 1000).toFixed(1)} t
                    {w.endedAt ? ` · ${Math.round((+new Date(w.endedAt) - +new Date(w.startedAt)) / 60000)} min` : ""}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
