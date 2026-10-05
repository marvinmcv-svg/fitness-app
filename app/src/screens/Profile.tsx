import { useState } from "react";
import { MUSCLES } from "../../../src/data/catalog";
import { cloudEnabled } from "../cloud";
import { PRESET_RANGE, program, seedState, targetsMacros, type AppState, type TargetPreset } from "../store";
import { Icon } from "../ui/Icon";

const GOAL_LABEL = { muscle: "Build muscle", strength: "Get stronger", fat_loss: "Lose fat", fitness: "Stay fit" } as const;
const EQUIP_LABEL = { gym: "Full gym", dumbbells: "Dumbbells & bench", home: "Minimal home setup" } as const;

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onEditAnswers: () => void;
  onSignOut: () => void;
  onCreateAccount: () => void;
}

export function Profile({ state, update, onEditAnswers, onSignOut, onCreateAccount }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const setPreset = (preset: TargetPreset) => update((s) => ({ ...s, preset }));
  const p = state.profile;
  const macros = targetsMacros(p);
  const name = p?.name || state.account?.name || "Athlete";
  const member = state.account?.mode === "member";

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">Settings</p>
          <h1>Profile</h1>
        </div>
      </header>

      <section className="card profile-card">
        <div className="avatar avatar-lg">{initials(name)}</div>
        <div className="row-text">
          <p className="row-title">{name}</p>
          <p className="row-sub">{member ? state.account?.email : "Guest · saved on this device"}</p>
        </div>
        {member ? (
          <span className="pill pill-good">Synced</span>
        ) : (
          <button className="btn-small accent" onClick={onCreateAccount}>
            Create account
          </button>
        )}
      </section>

      {p && (
        <section className="group">
          <div className="group-head">
            <h3>Your plan</h3>
            <button className="link-btn" onClick={onEditAnswers}>
              Edit answers <Icon name="chevron" size={16} />
            </button>
          </div>
          <dl className="card facts">
            <Fact label="Goal" value={GOAL_LABEL[p.goal]} />
            <Fact label="Program" value={`${program.name} · ${p.daysPerWeek} days`} />
            <Fact label="Equipment" value={EQUIP_LABEL[p.equipment]} />
            <Fact label="Focus" value={p.focusMuscles.length ? p.focusMuscles.map((m) => MUSCLES.find((x) => x.slug === m)?.name).join(", ") : "Balanced"} />
            {macros && <Fact label="Daily targets" value={`${macros.calories} kcal · ${macros.protein}P · ${macros.carbs}C · ${macros.fat}F`} />}
          </dl>
        </section>
      )}

      <section className="group">
        <div className="group-head">
          <h3>Weekly set targets</h3>
        </div>
        <div className="segmented" role="tablist" aria-label="Weekly set targets">
          {(Object.keys(PRESET_RANGE) as TargetPreset[]).map((k) => (
            <button key={k} role="tab" aria-selected={state.preset === k} className={state.preset === k ? "on" : ""} onClick={() => setPreset(k)}>
              {PRESET_RANGE[k][0]}–{PRESET_RANGE[k][1]}
            </button>
          ))}
        </div>
        <p className="muted small footnote">Sets per muscle per week, trained at least twice. Set from your experience; change it any time.</p>
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
              <span className="row-title">{member ? "Profile and meals sync to your account" : "Stored on this device"}</span>
              <span className="row-sub">Workouts are saved on this device and work offline.</span>
            </span>
          </li>
          <li className="row">
            <button className="row-btn" onClick={() => update((s) => ({ ...seedState(), account: s.account, profile: s.profile, food: s.food, preset: s.preset }))}>
              <span className="row-icon tone-accent">
                <Icon name="reset" size={18} />
              </span>
              <span className="row-text">
                <span className="row-title">Load sample workouts</span>
                <span className="row-sub">Replace your workout history with three example weeks</span>
              </span>
            </button>
          </li>
          <li className="row">
            {confirmClear ? (
              <div className="confirm-inline">
                <span className="row-sub">Delete all {state.history.length} workouts?</span>
                <button
                  className="btn-small danger-fill"
                  onClick={() => {
                    update((s) => ({ ...s, history: [], active: null, sample: false }));
                    setConfirmClear(false);
                  }}
                >
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
                  <span className="row-title danger">Clear workouts</span>
                  <span className="row-sub">Delete all workouts on this device</span>
                </span>
              </button>
            )}
          </li>
          <li className="row">
            <button className="row-btn" onClick={onSignOut}>
              <span className="row-icon tone-danger">
                <Icon name="logout" size={18} />
              </span>
              <span className="row-text">
                <span className="row-title danger">{member ? "Sign out" : "Leave guest mode"}</span>
                <span className="row-sub">{member ? "Your data stays in your account" : cloudEnabled ? "Back to the sign-up page" : "Back to the welcome page"}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
