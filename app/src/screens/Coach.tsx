import { useEffect, useMemo, useRef, useState } from "react";
import type { CoachAction } from "../../../src/coach/spec";
import { detectRedFlag, RED_FLAG_REPLY, weeklyReview } from "../../../src/domain/coach";
import { askCoach, buildContext } from "../coachClient";
import { exerciseName, rollingVolume, targetsFor, targetsMacros, uid, type AppState, type CoachMessage } from "../store";
import { Icon } from "../ui/Icon";

const STARTERS = [
  "How did my week go?",
  "I only have 30 minutes today",
  "My lower back feels tight. What should I change?",
  "Why has my bench stopped going up?",
  "I had 3 eggs and 2 slices of toast for breakfast",
  "What should I eat after training?",
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
    });
  }, [state.history, state.food, state.profile, state.preset]);

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
      onMessages((c) => [...c, { id: uid(), role: "assistant", content: RED_FLAG_REPLY[flag], at: new Date().toISOString(), safety: true }]);
      return;
    }

    setBusy(true);
    const turns = [...chat, userMsg].filter((m) => !m.safety).map((m) => ({ role: m.role, content: m.content }));
    const result = await askCoach(turns, buildContext(state));
    setBusy(false);
    if (!result.ok) {
      setError(result.code === "not_configured" ? "The AI coach isn't connected yet. Your daily brief and readiness check still work." : result.error);
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
    <div className="coach" role="dialog" aria-label="Coach">
      <header className="coach-nav">
        <button className="icon-btn" onClick={onClose} aria-label="Close coach">
          <Icon name="chevronDown" />
        </button>
        <div className="coach-id">
          <span className="coach-avatar" aria-hidden="true">
            <Icon name="sparkle" size={18} stroke={2.2} />
          </span>
          <span>
            <strong>Coach</strong>
            <em>{busy ? "Thinking…" : "Knows your training and meals"}</em>
          </span>
        </div>
        <button className={`btn-small${showMemory ? " accent" : ""}`} onClick={() => setShowMemory(!showMemory)} aria-expanded={showMemory}>
          Memory {state.coach.memory.length ? `· ${state.coach.memory.length}` : ""}
        </button>
      </header>

      {showMemory && (
        <div className="memory">
          <p className="muted small">The coach keeps these in mind in every conversation. Tell it something new, or remove anything that's out of date.</p>
          {state.coach.memory.length ? (
            <ul className="memory-list">
              {state.coach.memory.map((m) => (
                <li key={m.id}>
                  <span>{m.note}</span>
                  <button className="row-del" onClick={() => onForget(m.id)} aria-label={`Forget: ${m.note}`}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">Nothing saved yet. Try “I have a bad left knee” or “I train at 6 am before work.”</p>
          )}
        </div>
      )}

      <div className="coach-scroll" ref={scroller}>
        <section className="card review">
          <p className="eyebrow">This week</p>
          <p className="review-headline">{review.headline}</p>
          <div className="review-stats">
            <span>
              <strong>
                {review.sessions}/{review.plannedSessions}
              </strong>
              sessions
            </span>
            <span>
              <strong>
                {review.musclesOnTarget}/{review.musclesTracked}
              </strong>
              muscles on target
            </span>
            <span>
              <strong>{review.avgCalories ? review.avgCalories.toLocaleString() : "—"}</strong>
              {review.calorieTarget ? `avg kcal of ${review.calorieTarget.toLocaleString()}` : "avg kcal"}
            </span>
          </div>
        </section>

        {chat.length === 0 && (
          <div className="coach-empty">
            <p className="coach-hello">
              Hi{state.profile?.name ? ` ${state.profile.name}` : ""}. I can see your program, your last 7 days of training and today's meals. Ask me anything, or tell me how you feel today.
            </p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="starter" onClick={() => void send(s)}>
                  {s}
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
                  <Icon name="warning" size={14} /> Safety first
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
            <div className="bubble assistant typing" aria-label="Coach is typing">
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
          placeholder="Ask your coach…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          aria-label="Message the coach"
        />
        <button className="send" type="submit" disabled={!draft.trim() || busy} aria-label="Send">
          <Icon name="arrowUp" size={18} stroke={2.6} />
        </button>
      </form>
      <p className="coach-disclaimer">The coach can make mistakes and isn't medical advice.</p>
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
            Apply
          </button>
          <button className="btn-small" onClick={onDismiss}>
            No thanks
          </button>
        </div>
      ) : (
        <span className={`action-status ${status}`}>{status === "applied" ? "Applied" : "Dismissed"}</span>
      )}
    </div>
  );
}

function describe(a: CoachAction): { icon: "swap" | "calendar" | "chart" | "pie"; title: string; body: string } {
  switch (a.type) {
    case "swap_exercise":
      return { icon: "swap", title: `Swap in ${exerciseName(a.exercise)}`, body: a.reason };
    case "change_program":
      return { icon: "calendar", title: `Switch to ${a.program_slug === "full-body" ? "Full Body 3×" : a.program_slug === "upper-lower" ? "Upper / Lower" : "the 6-day split"}`, body: a.reason };
    case "set_volume_targets":
      return { icon: "chart", title: `Set weekly targets to ${a.preset}`, body: a.reason };
    case "log_food":
      return {
        icon: "pie",
        title: `Log ${a.name}`,
        body: `${capitalize(a.meal)} · ${Math.round(a.calories)} kcal · P ${Math.round(a.protein)} · C ${Math.round(a.carbs)} · F ${Math.round(a.fat)}`,
      };
    case "remember":
      return { icon: "chart", title: "Remembered", body: a.note };
  }
}

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
