import { useEffect, useMemo, useRef, useState } from "react";
import type { CoachAction } from "../../../src/coach/spec";
import { detectRedFlag, RED_FLAG_REPLY, weeklyReview } from "../../../src/domain/coach";
import { templateBySlug } from "../../../src/data/templates";
import { askCoach, buildContext } from "../coachClient";
import { exerciseName, rollingVolume, targetsFor, targetsMacros, uid, type AppState, type CoachMessage } from "../store";
import { lang, N_, t } from "../i18n";
import { Icon } from "../ui/Icon";

const STARTERS = [
  N_("How did my week go?"),
  N_("I only have 30 minutes today"),
  N_("My lower back feels tight. What should I change?"),
  N_("Why has my bench stopped going up?"),
  N_("I had 3 eggs and 2 slices of toast for breakfast"),
  N_("What should I eat after training?"),
];

interface Props {
  state: AppState;
  onClose: () => void;
  onMessages: (fn: (chat: CoachMessage[]) => CoachMessage[]) => void;
  onApply: (action: CoachAction) => string | null;
  onForget: (id: string) => void;
  onRemember: (note: string) => void;
  initialPrompt?: string;
}

export function Coach({ state, onClose, onMessages, onApply, onForget, onRemember, initialPrompt }: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const chat = state.coach.chat;

  const review = useMemo(() => {
    const { volume, workouts } = rollingVolume(state.history);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return state.food.filter((f) => sameDay(new Date(f.eatenAt), d)).reduce((n, f) => n + f.macros.calories, 0);
    });
    return weeklyReview({
      sessions: workouts.length,
      plannedSessions: state.profile?.daysPerWeek ?? 4,
      volume,
      targets: targetsFor(state.preset),
      dailyCalories: days,
      calorieTarget: targetsMacros(state.profile)?.calories ?? null,
      tr: t,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history, state.food, state.profile, state.preset, lang()]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setDraft("");
    const userMsg: CoachMessage = { id: uid(), role: "user", content, at: new Date().toISOString() };
    onMessages((c) => [...c, userMsg]);

    const flag = detectRedFlag(content);
    if (flag) {
      onMessages((c) => [...c, { id: uid(), role: "assistant", content: t(RED_FLAG_REPLY[flag]), at: new Date().toISOString(), safety: true }]);
      return;
    }

    setBusy(true);
    const turns = [...chat, userMsg].filter((m) => !m.safety).map((m) => ({ role: m.role, content: m.content }));
    const result = await askCoach(turns, buildContext(state));
    setBusy(false);
    if (!result.ok) {
      setError(result.code === "not_configured" ? t("The AI coach isn't connected yet. Your daily brief and readiness check still work.") : result.error);
      return;
    }
    const remembered = result.actions.filter((a): a is Extract<CoachAction, { type: "remember" }> => a.type === "remember");
    remembered.forEach((a) => onRemember(a.note));
    onMessages((c) => [
      ...c,
      {
        id: uid(),
        role: "assistant",
        content: result.reply,
        at: new Date().toISOString(),
        actions: result.actions.filter((a) => a.type !== "remember").map((action) => ({ action, status: "pending" as const })),
      },
    ]);
  };

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const setStatus = (msgId: string, idx: number, status: "applied" | "dismissed") =>
    onMessages((c) => c.map((m) => (m.id === msgId ? { ...m, actions: m.actions?.map((a, i) => (i === idx ? { ...a, status } : a)) } : m)));

  return (
    <div className="coach" role="dialog" aria-label={t("Coach")}>
      <header className="coach-nav">
        <button className="icon-btn" onClick={onClose} aria-label={t("Close coach")}>
          <Icon name="chevronDown" />
        </button>
        <div className="coach-id">
          <span className="coach-avatar" aria-hidden="true">
            <Icon name="sparkle" size={18} stroke={2.2} />
          </span>
          <span>
            <strong>{t("Coach")}</strong>
            <em>{busy ? t("Thinking…") : t("Knows your training and meals")}</em>
          </span>
        </div>
        <button className={`btn-small${showMemory ? " accent" : ""}`} onClick={() => setShowMemory(!showMemory)} aria-expanded={showMemory}>
          {t("Memory")} {state.coach.memory.length ? `· ${state.coach.memory.length}` : ""}
        </button>
      </header>

      {showMemory && (
        <div className="memory">
          <p className="muted small">{t("The coach keeps these in mind in every conversation. Tell it something new, or remove anything that's out of date.")}</p>
          {state.coach.memory.length ? (
            <ul className="memory-list">
              {state.coach.memory.map((m) => (
                <li key={m.id}>
                  <span>{m.note}</span>
                  <button className="row-del" onClick={() => onForget(m.id)} aria-label={t("Forget: {note}", { note: m.note })}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">{t("Nothing saved yet. Try “I have a bad left knee” or “I train at 6 am before work.”")}</p>
          )}
        </div>
      )}

      <div className="coach-scroll" ref={scroller}>
        <section className="card review">
          <p className="eyebrow">{t("This week")}</p>
          <p className="review-headline">{review.headline}</p>
          <div className="review-stats">
            <span>
              <strong>
                {review.sessions}/{review.plannedSessions}
              </strong>
              {t("sessions")}
            </span>
            <span>
              <strong>
                {review.musclesOnTarget}/{review.musclesTracked}
              </strong>
              {t("muscles on target")}
            </span>
            <span>
              <strong>{review.avgCalories ? review.avgCalories.toLocaleString() : "—"}</strong>
              {review.calorieTarget ? t("avg kcal of {target}", { target: review.calorieTarget.toLocaleString(lang()) }) : t("avg kcal")}
            </span>
          </div>
        </section>

        {chat.length === 0 && (
          <div className="coach-empty">
            <p className="coach-hello">
              {state.profile?.name ? t("Hi {name}.", { name: state.profile.name }) : t("Hi.")} {t("I can see your program, your last 7 days of training and today's meals. Ask me anything, or tell me how you feel today.")}
            </p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="starter" onClick={() => void send(t(s))}>
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m) => (
          <div key={m.id} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}${m.safety ? " safety" : ""}`}>
              {m.safety && (
                <span className="safety-tag">
                  <Icon name="warning" size={14} /> {t("Safety first")}
                </span>
              )}
              {m.content.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {m.actions?.map((a, i) => (
              <ActionCard
                key={i}
                action={a.action}
                status={a.status}
                onApply={() => {
                  const err = onApply(a.action);
                  if (err) setError(err);
                  else setStatus(m.id, i, "applied");
                }}
                onDismiss={() => setStatus(m.id, i, "dismissed")}
              />
            ))}
          </div>
        ))}

        {busy && (
          <div className="bubble-row assistant">
            <div className="bubble assistant typing" aria-label={t("Coach is typing")}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {error && <p className="auth-msg error">{error}</p>}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          id="coach-input"
          rows={1}
          value={draft}
          placeholder={t("Ask your coach…")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          aria-label={t("Message the coach")}
        />
        <button className="send" type="submit" disabled={!draft.trim() || busy} aria-label={t("Send")}>
          <Icon name="arrowUp" size={18} stroke={2.6} />
        </button>
      </form>
      <p className="coach-disclaimer">{t("The coach can make mistakes and isn't medical advice.")}</p>
    </div>
  );
}

function ActionCard({ action, status, onApply, onDismiss }: { action: CoachAction; status: "pending" | "applied" | "dismissed"; onApply: () => void; onDismiss: () => void }) {
  const { icon, title, body } = describe(action);
  return (
    <div className={`action-card ${status}`}>
      <span className="action-icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="action-text">
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      {status === "pending" ? (
        <div className="action-btns">
          <button className="btn-small accent" onClick={onApply}>
            {t("Apply")}
          </button>
          <button className="btn-small" onClick={onDismiss}>
            {t("No thanks")}
          </button>
        </div>
      ) : (
        <span className={`action-status ${status}`}>{status === "applied" ? t("Applied") : t("Dismissed")}</span>
      )}
    </div>
  );
}

function describe(a: CoachAction): { icon: "swap" | "calendar" | "chart" | "pie"; title: string; body: string } {
  switch (a.type) {
    case "swap_exercise":
      return { icon: "swap", title: t("Swap in {exercise}", { exercise: exerciseName(a.exercise) }), body: a.reason };
    case "change_program":
      return { icon: "calendar", title: t("Switch to {program}", { program: t(templateBySlug(a.program_slug)?.name ?? a.program_slug) }), body: a.reason };
    case "set_volume_targets":
      return { icon: "chart", title: t("Set weekly targets to {preset}", { preset: t(PRESET_NAME[a.preset]) }), body: a.reason };
    case "log_food":
      return {
        icon: "pie",
        title: t("Log {food}", { food: a.name }),
        body: `${t(MEAL_NAME[a.meal])} · ${Math.round(a.calories)} kcal · P ${Math.round(a.protein)} · C ${Math.round(a.carbs)} · F ${Math.round(a.fat)}`,
      };
    case "remember":
      return { icon: "chart", title: t("Remembered"), body: a.note };
  }
}

const MEAL_NAME = { breakfast: N_("Breakfast"), lunch: N_("Lunch"), dinner: N_("Dinner"), snack: N_("Snack") } as const;
const PRESET_NAME = { beginner: N_("beginner"), standard: N_("standard"), advanced: N_("advanced") } as const;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
