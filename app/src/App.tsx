import { useEffect, useMemo, useRef, useState } from "react";
import { swapKey } from "../../src/domain/personalize";
import * as cloud from "./cloud";
import { Macros } from "./screens/Macros";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import { Program } from "./screens/Program";
import { Progress } from "./screens/Progress";
import { Today } from "./screens/Today";
import { Welcome } from "./screens/Welcome";
import { Workout } from "./screens/Workout";
import {
  buildProgram,
  dayByKey,
  finishSession,
  nextDayKey,
  setProgram,
  startSession,
  targetsMacros,
  useAppState,
  workingSets,
  type AppState,
  type Profile as MemberProfile,
  type TargetPreset,
} from "./store";
import { Icon, type IconName } from "./ui/Icon";

type Tab = "today" | "program" | "macros" | "progress" | "profile";
const LEFT_TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "program", label: "Program", icon: "calendar" },
];
const RIGHT_TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "macros", label: "Macros", icon: "pie" },
  { id: "progress", label: "Progress", icon: "chart" },
];

const PRESET_FOR: Record<MemberProfile["experience"], TargetPreset> = { new: "beginner", intermediate: "standard", advanced: "advanced" };

export function App() {
  const [state, update] = useAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [showWorkout, setShowWorkout] = useState(false);
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Rebuild the personalized program whenever the profile changes.
  useMemo(() => setProgram(buildProgram(state.profile)), [state.profile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Supabase session -> member account; pull their profile and recent meals, or push the guest's.
  useEffect(
    () =>
      cloud.onSession(async (session) => {
        if (!session) return;
        const userId = session.user.id;
        const account = { mode: "member" as const, userId, email: session.user.email, name: cloud.displayNameOf(session) };
        const local = stateRef.current;
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const [remoteProfile, remoteFood] = await Promise.all([cloud.loadProfile(userId), cloud.loadFood(userId, since)]);

        if (!remoteProfile && local.profile) {
          await cloud.saveProfile(userId, local.profile, targetsMacros(local.profile));
          await Promise.all(local.food.map((f) => cloud.saveFood(userId, f)));
        }
        setShowAuth(false);
        update((s) => ({
          ...s,
          account,
          profile: remoteProfile ?? s.profile,
          preset: remoteProfile ? PRESET_FOR[remoteProfile.experience] : s.preset,
          food: remoteFood && remoteFood.length ? remoteFood : s.food,
        }));
      }),
    [update],
  );

  const member = state.account?.mode === "member" ? state.account.userId! : null;

  const saveProfile = (profile: MemberProfile) => {
    update((s) => ({ ...s, profile }));
    if (member) void cloud.saveProfile(member, profile, targetsMacros(profile));
  };

  /* ------------------------------------------------------------- gates */

  if (!state.account || showAuth) {
    return (
      <Frame>
        <main className="viewport bare">
          <Welcome
            onGuest={() => {
              setShowAuth(false);
              update((s) => ({ ...s, account: s.account ?? { mode: "guest" } }));
            }}
          />
        </main>
      </Frame>
    );
  }

  if (!state.profile || editingAnswers) {
    return (
      <Frame>
        <main className="viewport bare">
          <Onboarding
            initial={state.profile}
            name={state.account.name ?? ""}
            onDone={(profile) => {
              const first = !state.profile;
              saveProfile(profile);
              update((s) => ({ ...s, preset: PRESET_FOR[profile.experience] }));
              setEditingAnswers(false);
              setTab(first ? "today" : "profile");
              setToast(first ? "Your plan is ready" : "Plan updated");
            }}
          />
        </main>
      </Frame>
    );
  }

  /* -------------------------------------------------------------- main */

  const profile = state.profile;
  const start = (dayKey: string) => {
    update((s) => ({ ...s, active: s.active ?? startSession(s.history, dayKey) }));
    setShowWorkout(true);
  };
  const center = () => (state.active ? setShowWorkout(true) : start(nextDayKey(state.history)));

  return (
    <Frame>
      <main className="viewport">
        {tab === "today" && <Today state={state} onStart={start} onResume={() => setShowWorkout(true)} onProfile={() => setTab("profile")} />}
        {tab === "program" && (
          <Program
            state={state}
            onStart={start}
            onChangeProgram={(slug) => {
              saveProfile({ ...profile, programSlug: slug, swaps: {} });
              setToast("Program switched");
            }}
            onSwap={(dayKey, baseIndex, exercise) => {
              const swaps = { ...profile.swaps };
              const k = swapKey(dayKey, baseIndex);
              if (exercise) swaps[k] = exercise;
              else delete swaps[k];
              saveProfile({ ...profile, swaps });
            }}
          />
        )}
        {tab === "macros" && (
          <Macros
            state={state}
            onAdd={(entries) => {
              update((s) => ({ ...s, food: [...s.food, ...entries] }));
              if (member) entries.forEach((e) => void cloud.saveFood(member, e));
              const kcal = entries.reduce((n, e) => n + e.macros.calories, 0);
              setToast(`Logged ${kcal} kcal`);
            }}
            onDelete={(id) => {
              update((s) => ({ ...s, food: s.food.filter((f) => f.id !== id) }));
              if (member) void cloud.deleteFood(member, id);
            }}
          />
        )}
        {tab === "progress" && <Progress state={state} />}
        {tab === "profile" && (
          <Profile
            state={state}
            update={update}
            onEditAnswers={() => setEditingAnswers(true)}
            onCreateAccount={() => setShowAuth(true)}
            onSignOut={async () => {
              if (member) {
                await cloud.signOut();
                update((s): AppState => ({ ...s, account: null, profile: null, food: [], active: null }));
              } else {
                update((s) => ({ ...s, account: null }));
              }
              setTab("today");
            }}
          />
        )}
      </main>

      {state.active && !showWorkout && (
        <button className="mini-player" onClick={() => setShowWorkout(true)}>
          <span className="mini-dot" aria-hidden="true" />
          <span className="mini-text">
            <strong>{dayByKey(state.active.dayKey).label}</strong>
            <span>{state.active.exercises.flatMap((e) => e.sets).filter((s) => s.done).length} sets done · tap to resume</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <nav className="tabbar" aria-label="Main">
        {LEFT_TABS.map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
        <button className={`tab-center${state.active ? " live" : ""}`} onClick={center} aria-label={state.active ? "Resume workout" : "Start next workout"}>
          <Icon name={state.active ? "dumbbell" : "plus"} size={26} stroke={2.4} />
        </button>
        {RIGHT_TABS.map((t) => (
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
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="device">{children}</div>
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
