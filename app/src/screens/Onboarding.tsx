import { useMemo, useState } from "react";
import { TEMPLATES } from "../../../src/data/templates";
import { macroTargets, type Activity, type Sex } from "../../../src/domain/nutrition";
import { recommendTemplate, type EquipmentProfile, type Experience, type Goal } from "../../../src/domain/personalize";
import { dayName, N_, t } from "../i18n";
import { muscleName, type Profile } from "../store";
import { Icon, type IconName } from "../ui/Icon";

type Draft = Omit<Profile, "programSlug" | "swaps"> & { programSlug: string | null };

const GOALS: { id: Goal; title: string; body: string; icon: IconName }[] = [
  { id: "muscle", title: N_("Build muscle"), body: N_("Grow size with smart weekly volume"), icon: "dumbbell" },
  { id: "strength", title: N_("Get stronger"), body: N_("Push your main lifts up every month"), icon: "bolt" },
  { id: "fat_loss", title: N_("Lose fat"), body: N_("Keep your muscle while you lean out"), icon: "flame" },
  { id: "fitness", title: N_("Stay fit"), body: N_("Train consistently and feel good"), icon: "sparkle" },
];
const EXPERIENCE: { id: Experience; title: string; body: string }[] = [
  { id: "new", title: N_("New to lifting"), body: N_("Less than 6 months of steady training") },
  { id: "intermediate", title: N_("Some experience"), body: N_("6 months to 3 years") },
  { id: "advanced", title: N_("Experienced"), body: N_("3+ years, comfortable with heavy compounds") },
];
const EQUIPMENT: { id: EquipmentProfile; title: string; body: string }[] = [
  { id: "gym", title: N_("Full gym"), body: N_("Barbells, cables and machines") },
  { id: "dumbbells", title: N_("Dumbbells & bench"), body: N_("Home or hotel gym with a pull-up bar") },
  { id: "home", title: N_("Minimal home setup"), body: N_("Bodyweight, bands and a pair of dumbbells") },
];
const ACTIVITY: { id: Activity; title: string; body: string }[] = [
  { id: "sedentary", title: N_("Mostly sitting"), body: N_("Desk job, little walking") },
  { id: "light", title: N_("Lightly active"), body: N_("Some walking during the day") },
  { id: "moderate", title: N_("Active"), body: N_("On your feet a lot, or 8k+ steps") },
  { id: "very", title: N_("Very active"), body: N_("Physical job or 12k+ steps") },
];
const FOCUS = ["chest", "lats", "upper_back", "side_delts", "rear_delts", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];

const STEPS = ["goal", "experience", "days", "equipment", "focus", "body", "plan"] as const;

export function Onboarding({ initial, name, onDone }: { initial: Profile | null; name: string; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(
    initial ?? {
      name,
      goal: "muscle",
      experience: "intermediate",
      daysPerWeek: 4,
      equipment: "gym",
      focusMuscles: [],
      sex: "male",
      age: 28,
      heightCm: 175,
      weightKg: 75,
      activity: "light",
      programSlug: null,
    },
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const recommended = recommendTemplate(d.daysPerWeek);
  const chosen = d.programSlug ?? recommended;
  const macros = useMemo(() => macroTargets(d, d.goal), [d]);
  const id = STEPS[step]!;
  const bodyValid = d.age >= 14 && d.age <= 90 && d.heightCm >= 120 && d.heightCm <= 230 && d.weightKg >= 35 && d.weightKg <= 250;

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone({ ...d, programSlug: chosen, swaps: initial?.programSlug === chosen ? initial.swaps : {} });
  };

  return (
    <div className="onb">
      <header className="onb-head">
        <button className="icon-btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label={t("Back")}>
          <Icon name="chevron" className="flip" />
        </button>
        <div className="onb-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="onb-count">
          {step + 1}/{STEPS.length}
        </span>
      </header>

      <div className="onb-body" key={id}>
        {id === "goal" && (
          <Question title={d.name ? t("What's your main goal, {name}?", { name: d.name }) : t("What's your main goal?")} sub={t("We'll shape your training and calories around it.")}>
            <Choices items={GOALS} value={d.goal} onChange={(v) => set("goal", v)} />
          </Question>
        )}
        {id === "experience" && (
          <Question title={t("How long have you been lifting?")} sub={t("This sets how many weekly sets you start with.")}>
            <Choices items={EXPERIENCE} value={d.experience} onChange={(v) => set("experience", v)} />
          </Question>
        )}
        {id === "days" && (
          <Question title={t("How many days a week can you train?")} sub={t("Pick what you can keep up on a busy week.")}>
            <div className="day-picker">
              {[3, 4, 5, 6].map((n) => (
                <button key={n} className={`day-pick${d.daysPerWeek === n ? " on" : ""}`} onClick={() => set("daysPerWeek", n)} aria-pressed={d.daysPerWeek === n}>
                  <strong>{n}</strong>
                  <span>{t("days")}</span>
                </button>
              ))}
            </div>
            <p className="onb-hint">
              <Icon name="sparkle" size={16} /> {t("{program} fits {n} days best.", { program: t(TEMPLATES.find((x) => x.slug === recommendTemplate(d.daysPerWeek))!.name), n: d.daysPerWeek })}
            </p>
          </Question>
        )}
        {id === "equipment" && (
          <Question title={t("Where do you train?")} sub={t("We'll only pick exercises you can actually do.")}>
            <Choices items={EQUIPMENT} value={d.equipment} onChange={(v) => set("equipment", v)} />
          </Question>
        )}
        {id === "focus" && (
          <Question title={t("Any muscles you want to bring up?")} sub={t("Optional. Each pick adds a set to exercises that train it.")}>
            <div className="chip-grid">
              {FOCUS.map((m) => {
                const on = d.focusMuscles.includes(m);
                return (
                  <button
                    key={m}
                    className={`chip${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => set("focusMuscles", on ? d.focusMuscles.filter((x) => x !== m) : [...d.focusMuscles, m].slice(-3))}
                  >
                    {on && <Icon name="check" size={14} stroke={2.6} />}
                    {muscleName.get(m)}
                  </button>
                );
              })}
            </div>
            <p className="onb-hint muted">{t("Pick up to 3.")}</p>
          </Question>
        )}
        {id === "body" && (
          <Question title={t("A bit about you")} sub={t("Used only to personalize your plan and estimate calories and protein.")}>
            <label className="field">
              <span>{t("What should we call you?")}</span>
              <input id="onb-name" autoComplete="given-name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder={t("Your first name")} />
            </label>
            <div className="segmented" role="tablist" aria-label={t("Sex")}>
              {(["male", "female"] as Sex[]).map((s) => (
                <button key={s} role="tab" aria-selected={d.sex === s} className={d.sex === s ? "on" : ""} onClick={() => set("sex", s)}>
                  {s === "male" ? t("Male") : t("Female")}
                </button>
              ))}
            </div>
            <div className="num-fields">
              <NumField id="onb-age" label={t("Age")} unit={t("yrs")} value={d.age} onChange={(v) => set("age", v)} />
              <NumField id="onb-height" label={t("Height")} unit="cm" value={d.heightCm} onChange={(v) => set("heightCm", v)} />
              <NumField id="onb-weight" label={t("Weight")} unit="kg" value={d.weightKg} onChange={(v) => set("weightKg", v)} />
            </div>
            <p className="onb-label">{t("Daily activity outside the gym")}</p>
            <Choices items={ACTIVITY} value={d.activity} onChange={(v) => set("activity", v)} compact />
          </Question>
        )}
        {id === "plan" && (
          <Question title={t("Your plan is ready")} sub={t("Pick a program. You can switch or swap exercises any time.")}>
            <div className="plan-cards">
              {TEMPLATES.map((tp) => (
                <button key={tp.slug} className={`plan-card${chosen === tp.slug ? " on" : ""}`} onClick={() => set("programSlug", tp.slug)} aria-pressed={chosen === tp.slug}>
                  <span className="plan-card-top">
                    <strong>{t(tp.name)}</strong>
                    {tp.slug === recommended && <span className="pill">{t("Recommended")}</span>}
                  </span>
                  <span className="plan-card-body">{tp.description ? t(tp.description) : null}</span>
                  <span className="plan-card-days">
                    {tp.weekLayout.map((k, i) => (
                      <span key={i}>{dayName(tp.days.find((x) => x.key === k)!.label)}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <div className="card macro-preview">
              <p className="onb-label">{t("Daily targets")}</p>
              <div className="macro-preview-row">
                <span><strong>{macros.calories}</strong> kcal</span>
                <span><strong>{macros.protein}g</strong> {t("protein")}</span>
                <span><strong>{macros.carbs}g</strong> {t("carbs")}</span>
                <span><strong>{macros.fat}g</strong> {t("fat")}</span>
              </div>
            </div>
          </Question>
        )}
      </div>

      <footer className="onb-foot">
        <button className="btn-primary" onClick={next} disabled={id === "body" && !bodyValid}>
          {id === "plan" ? t("Start training") : t("Continue")}
        </button>
        {id === "body" && !bodyValid && <p className="auth-msg error">{t("Check your age, height and weight.")}</p>}
      </footer>
    </div>
  );
}

function Question({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="question">
      <h1>{title}</h1>
      <p className="muted">{sub}</p>
      <div className="question-body">{children}</div>
    </section>
  );
}

function Choices<T extends string>({
  items,
  value,
  onChange,
  compact,
}: {
  items: { id: T; title: string; body: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <div className={`choices${compact ? " compact" : ""}`} role="radiogroup">
      {items.map((it) => (
        <button key={it.id} role="radio" aria-checked={value === it.id} className={`choice${value === it.id ? " on" : ""}`} onClick={() => onChange(it.id)}>
          {it.icon && (
            <span className="choice-icon">
              <Icon name={it.icon} size={20} />
            </span>
          )}
          <span className="choice-text">
            <strong>{t(it.title)}</strong>
            <span>{t(it.body)}</span>
          </span>
          <span className="choice-radio" aria-hidden="true">
            {value === it.id && <Icon name="check" size={14} stroke={3} />}
          </span>
        </button>
      ))}
    </div>
  );
}

function NumField({ id, label, unit, value, onChange }: { id: string; label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="num-field" htmlFor={id}>
      <span>{label}</span>
      <span className="num-field-input">
        <input id={id} inputMode="decimal" value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, "")))} />
        <em>{unit}</em>
      </span>
    </label>
  );
}
