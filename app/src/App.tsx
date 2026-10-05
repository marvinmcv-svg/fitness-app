import { useEffect, useState } from "react";
import { Profile } from "./screens/Profile";
import { Program } from "./screens/Program";
import { Progress } from "./screens/Progress";
import { Today } from "./screens/Today";
import { Workout } from "./screens/Workout";
import { dayByKey, finishSession, nextDayKey, startSession, useAppState, workingSets } from "./store";
import { Icon, type IconName } from "./ui/Icon";

type Tab = "today" | "program" | "progress" | "profile";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "program", label: "Program", icon: "calendar" },
  { id: "progress", label: "Progress", icon: "chart" },
  { id: "profile", label: "Profile", icon: "person" },
];

export function App() {
  const [state, update] = useAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [showWorkout, setShowWorkout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const start = (dayKey: string) => {
    update((s) => ({ ...s, active: s.active ?? startSession(s.history, dayKey) }));
    setShowWorkout(true);
  };

  const center = () => (state.active ? setShowWorkout(true) : start(nextDayKey(state.history)));

  return (
    <div className="stage">
      <div className="device">
        <main className="viewport">
          {tab === "today" && <Today state={state} onStart={start} onResume={() => setShowWorkout(true)} />}
          {tab === "program" && <Program state={state} onStart={start} />}
          {tab === "progress" && <Progress state={state} />}
          {tab === "profile" && <Profile state={state} update={update} />}
        </main>

        {state.active && !showWorkout && (
          <button className="mini-player" onClick={() => setShowWorkout(true)}>
            <span className="mini-dot" aria-hidden="true" />
            <span className="mini-text">
              <strong>{dayByKey(state.active.dayKey).label}</strong>
              <span>
                {state.active.exercises.flatMap((e) => e.sets).filter((s) => s.done).length} sets done · tap to resume
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        )}

        <nav className="tabbar" aria-label="Main">
          {TABS.slice(0, 2).map((t) => (
            <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
          <button className={`tab-center${state.active ? " live" : ""}`} onClick={center} aria-label={state.active ? "Resume workout" : "Start next workout"}>
            <Icon name={state.active ? "dumbbell" : "plus"} size={26} stroke={2.4} />
          </button>
          {TABS.slice(2).map((t) => (
            <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </nav>

        {state.active && showWorkout && (
          <Workout
            session={state.active}
            history={state.history}
            onChange={(active) => update((s) => ({ ...s, active }))}
            onMinimize={() => setShowWorkout(false)}
            onDiscard={() => {
              update((s) => ({ ...s, active: null }));
              setShowWorkout(false);
              setToast("Workout discarded");
            }}
            onFinish={() => {
              const w = finishSession(state.active!);
              update((s) => ({ ...s, active: null, history: [...s.history, w] }));
              setShowWorkout(false);
              setTab("today");
              setToast(`Workout saved · ${workingSets(w)} working sets`);
            }}
          />
        )}

        {toast && (
          <div className="toast" role="status">
            <Icon name="check" size={16} stroke={2.6} /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ label, icon, active, onClick }: { label: string; icon: IconName; active: boolean; onClick: () => void }) {
  return (
    <button className={`tab${active ? " on" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={23} stroke={active ? 2.3 : 1.9} />
      <span>{label}</span>
    </button>
  );
}
