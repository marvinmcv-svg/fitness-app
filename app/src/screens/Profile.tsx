import { useState } from "react";
import { cloudEnabled } from "../cloud";
import { LANGS, N_, t, type Lang } from "../i18n";
import { muscleName, PRESET_RANGE, program, seedState, targetsMacros, type Accent, type Appearance, type AppState, type Settings, type TargetPreset } from "../store";
import { Icon } from "../ui/Icon";

const GOAL_LABEL = { muscle: N_("Build muscle"), strength: N_("Get stronger"), fat_loss: N_("Lose fat"), fitness: N_("Stay fit") } as const;
const EQUIP_LABEL = { gym: N_("Full gym"), dumbbells: N_("Dumbbells & bench"), home: N_("Minimal home setup") } as const;

/** Swatch colors shown in Settings; the real tokens live in styles.css. */
export const ACCENTS: { id: Accent; name: string; swatch: [string, string] }[] = [
  { id: "violet", name: N_("Violet"), swatch: ["#6447f0", "#a996ff"] },
  { id: "ember", name: N_("Ember"), swatch: ["#e4532b", "#ff9b78"] },
  { id: "ocean", name: N_("Ocean"), swatch: ["#1d6af2", "#80b1ff"] },
  { id: "forest", name: N_("Forest"), swatch: ["#0e9468", "#6fe3b5"] },
  { id: "rose", name: N_("Rose"), swatch: ["#e0386f", "#ff9dc0"] },
  { id: "graphite", name: N_("Graphite"), swatch: ["#1f1f24", "#8e8e96"] },
];

const APPEARANCE: { id: Appearance; label: string }[] = [
  { id: "system", label: N_("Automatic") },
  { id: "light", label: N_("Light") },
  { id: "dark", label: N_("Dark") },
];

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
  const setSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const p = state.profile;
  const macros = targetsMacros(p);
  const name = p?.name || state.account?.name || t("Athlete");
  const member = state.account?.mode === "member";
  const { settings } = state;

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">{t("Settings")}</p>
          <h1>{t("Profile")}</h1>
        </div>
      </header>

      <section className="card profile-card">
        <div className="avatar avatar-lg">{initials(name)}</div>
        <div className="row-text">
          <p className="row-title">{name}</p>
          <p className="row-sub">{member ? state.account?.email : t("Guest · saved on this device")}</p>
        </div>
        {member ? (
          <span className="pill pill-good">{t("Synced")}</span>
        ) : (
          <button className="btn-small accent" onClick={onCreateAccount}>
            {t("Create account")}
          </button>
        )}
      </section>

      <section className="group">
        <div className="group-head">
          <h3>{t("Appearance")}</h3>
          <Icon name="moon" size={18} className="muted" />
        </div>
        <div className="segmented" role="radiogroup" aria-label={t("Appearance")}>
          {APPEARANCE.map((a) => (
            <button key={a.id} role="radio" aria-checked={settings.appearance === a.id} className={settings.appearance === a.id ? "on" : ""} onClick={() => setSettings({ appearance: a.id })}>
              {t(a.label)}
            </button>
          ))}
        </div>
        <p className="muted small footnote">{t("Automatic follows your phone's light and dark mode.")}</p>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>{t("Theme")}</h3>
          <span className="muted small">{t(ACCENTS.find((a) => a.id === settings.accent)!.name)}</span>
        </div>
        <div className="card swatches" role="radiogroup" aria-label={t("Theme")}>
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={settings.accent === a.id}
              aria-label={t(a.name)}
              className={`swatch${settings.accent === a.id ? " on" : ""}`}
              style={{ "--sw-1": a.swatch[0], "--sw-2": a.swatch[1] } as React.CSSProperties}
              onClick={() => setSettings({ accent: a.id })}
            >
              <span className="swatch-dot" aria-hidden="true">
                {settings.accent === a.id && <Icon name="check" size={16} stroke={3} />}
              </span>
              <span className="swatch-name">{t(a.name)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>{t("Language")}</h3>
          <Icon name="globe" size={18} className="muted" />
        </div>
        <ul className="list card" role="radiogroup" aria-label={t("Language")}>
          {LANGS.map((l) => (
            <li className="row" key={l.id}>
              <button className="row-btn" role="radio" aria-checked={settings.lang === l.id} onClick={() => setSettings({ lang: l.id as Lang })} lang={l.id}>
                <span className="row-text">
                  <span className="row-title">{l.label}</span>
                </span>
                {settings.lang === l.id && <Icon name="check" size={18} stroke={2.6} className="text-accent" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="muted small footnote">{t("The coach replies in your language too.")}</p>
      </section>

      {p && (
        <section className="group">
          <div className="group-head">
            <h3>{t("Your plan")}</h3>
            <button className="link-btn" onClick={onEditAnswers}>
              {t("Edit answers")} <Icon name="chevron" size={16} />
            </button>
          </div>
          <dl className="card facts">
            <Fact label={t("Goal")} value={t(GOAL_LABEL[p.goal])} />
            <Fact label={t("Program")} value={`${t(program.name)} · ${t("{n} days", { n: p.daysPerWeek })}`} />
            <Fact label={t("Equipment")} value={t(EQUIP_LABEL[p.equipment])} />
            <Fact label={t("Focus")} value={p.focusMuscles.length ? p.focusMuscles.map((m) => muscleName.get(m)).join(", ") : t("Balanced")} />
            {macros && <Fact label={t("Daily targets")} value={`${macros.calories} kcal · ${macros.protein}P · ${macros.carbs}C · ${macros.fat}F`} />}
          </dl>
        </section>
      )}

      <section className="group">
        <div className="group-head">
          <h3>{t("Weekly set targets")}</h3>
        </div>
        <div className="segmented" role="tablist" aria-label={t("Weekly set targets")}>
          {(Object.keys(PRESET_RANGE) as TargetPreset[]).map((k) => (
            <button key={k} role="tab" aria-selected={state.preset === k} className={state.preset === k ? "on" : ""} onClick={() => setPreset(k)}>
              {PRESET_RANGE[k][0]}–{PRESET_RANGE[k][1]}
            </button>
          ))}
        </div>
        <p className="muted small footnote">{t("Sets per muscle per week, trained at least twice. Set from your experience; change it any time.")}</p>
      </section>

      <section className="group">
        <div className="group-head">
          <h3>{t("Data")}</h3>
          {state.sample && <span className="pill pill-warn">{t("Sample history")}</span>}
        </div>
        <ul className="list card">
          <li className="row">
            <span className="row-icon tone-accent">
              <Icon name="layers" size={18} />
            </span>
            <span className="row-text">
              <span className="row-title">{member ? t("Profile and meals sync to your account") : t("Stored on this device")}</span>
              <span className="row-sub">{t("Workouts are saved on this device and work offline.")}</span>
            </span>
          </li>
          <li className="row">
            <button
              className="row-btn"
              onClick={() => update((s) => ({ ...seedState(), settings: s.settings, coach: s.coach, account: s.account, profile: s.profile, food: s.food, preset: s.preset }))}
            >
              <span className="row-icon tone-accent">
                <Icon name="reset" size={18} />
              </span>
              <span className="row-text">
                <span className="row-title">{t("Load sample workouts")}</span>
                <span className="row-sub">{t("Replace your workout history with three example weeks")}</span>
              </span>
            </button>
          </li>
          <li className="row">
            {confirmClear ? (
              <div className="confirm-inline">
                <span className="row-sub">{t("Delete all {n} workouts?", { n: state.history.length })}</span>
                <button
                  className="btn-small danger-fill"
                  onClick={() => {
                    update((s) => ({ ...s, history: [], active: null, sample: false }));
                    setConfirmClear(false);
                  }}
                >
                  {t("Delete")}
                </button>
                <button className="btn-small" onClick={() => setConfirmClear(false)}>
                  {t("Cancel")}
                </button>
              </div>
            ) : (
              <button className="row-btn" onClick={() => setConfirmClear(true)}>
                <span className="row-icon tone-danger">
                  <Icon name="trash" size={18} />
                </span>
                <span className="row-text">
                  <span className="row-title danger">{t("Clear workouts")}</span>
                  <span className="row-sub">{t("Delete all workouts on this device")}</span>
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
                <span className="row-title danger">{member ? t("Sign out") : t("Leave guest mode")}</span>
                <span className="row-sub">{member ? t("Your data stays in your account") : cloudEnabled ? t("Back to the sign-up page") : t("Back to the welcome page")}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>
      <p className="muted small footnote app-version">FuerzaFlow</p>
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
