import { useState } from "react";
import { seedState, type AppState, type TargetPreset } from "../store";
import { Icon } from "../ui/Icon";

export function Profile({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const setPreset = (preset: TargetPreset) => update((s) => ({ ...s, preset }));

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">Settings</p>
          <h1>Profile</h1>
        </div>
      </header>

      <section className="card profile-card">
        <div className="avatar avatar-lg">MV</div>
        <div>
          <p className="row-title">Marvin</p>
          <p className="row-sub">{state.history.length} workouts logged · kg</p>
        </div>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Weekly set targets</h3>
        </div>
        <div className="segmented" role="tablist" aria-label="Weekly set targets">
          <button role="tab" aria-selected={state.preset === "standard"} className={state.preset === "standard" ? "on" : ""} onClick={() => setPreset("standard")}>
            Standard · 10–20
          </button>
          <button role="tab" aria-selected={state.preset === "advanced"} className={state.preset === "advanced" ? "on" : ""} onClick={() => setPreset("advanced")}>
            Advanced · 12–24
          </button>
        </div>
        <p className="muted small footnote">Sets per muscle per week, trained at least twice. Applies to Today, Program and Progress.</p>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>Data</h3>
          {state.sample && <span className="pill pill-warn">Sample history</span>}
        </div>
        <ul className="list card">
          <li className="row">
            <span className="row-icon tone-accent">
              <Icon name="layers" size={18} />
            </span>
            <span className="row-text">
              <span className="row-title">Stored on this device</span>
              <span className="row-sub">Works offline. Cloud sync arrives with accounts.</span>
            </span>
          </li>
          <li className="row">
            <button className="row-btn" onClick={() => update(() => seedState())}>
              <span className="row-icon tone-accent">
                <Icon name="reset" size={18} />
              </span>
              <span className="row-text">
                <span className="row-title">Load sample history</span>
                <span className="row-sub">Replace your data with three example weeks</span>
              </span>
            </button>
          </li>
          <li className="row">
            {confirmClear ? (
              <div className="confirm-inline">
                <span className="row-sub">Delete all {state.history.length} workouts?</span>
                <button className="btn-small danger-fill" onClick={() => { update((s) => ({ ...s, history: [], active: null, sample: false })); setConfirmClear(false); }}>
                  Delete
                </button>
                <button className="btn-small" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="row-btn" onClick={() => setConfirmClear(true)}>
                <span className="row-icon tone-danger">
                  <Icon name="trash" size={18} />
                </span>
                <span className="row-text">
                  <span className="row-title danger">Start fresh</span>
                  <span className="row-sub">Delete all workouts on this device</span>
                </span>
              </button>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}
