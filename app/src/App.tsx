import { useEffect, useMemo, useRef, useState } from "react";
import type { CoachAction } from "../../src/coach/spec";
import { adjustSession, type Readiness } from "../../src/domain/coach";
import { swapKey, swapOptions } from "../../src/domain/personalize";
import { templateBySlug } from "../../src/data/templates";
import * as cloud from "./cloud";
import { Coach } from "./screens/Coach";
import { plannedSlots, ReadinessSheet, WorkoutSummary } from "./screens/CoachSheets";
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
  catalog,
  uid,
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
  const [coach, setCoach] = useState<{ prompt?: string } | null>(null);
  const [readinessFor, setReadinessFor] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ workout: ReturnType<typeof finishSession>; before: AppState["history"] } | null>(null);
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
    if (state.active) return setShowWorkout(true);
    setReadinessFor(dayKey);
  };

  const beginSession = (dayKey: string, readiness: Readiness | null) => {
    update((s) => {
      if (s.active) return s;
      const session = startSession(s.history, dayKey);
      if (!readiness) return { ...s, active: session };
      const adj = adjustSession(plannedSlots(dayKey), readiness);
      const exercises = session.exercises
        .filter((_, i) => adj.slots[i]?.keep !== false)
        .map((ex) => {
          const target = adj.slots[ex.slotIndex]?.sets ?? ex.sets.length;
          return { ...ex, sets: ex.sets.slice(0, Math.max(1, target)) };
        });
      return { ...s, active: { ...session, exercises, coachNotes: adj.notes, effortCue: adj.effortCue } };
    });
    setReadinessFor(null);
    setShowWorkout(true);
  };

  const applyCoachAction = (a: CoachAction): string | null => {
    switch (a.type) {
      case "swap_exercise": {
        const base = templateBySlug(profile.programSlug)?.days.find((d) => d.key === a.day_key)?.slots[a.slot_index];
        if (!base || !swapOptions(base, catalog.exercises, profile.equipment).some((e) => e.slug === a.exercise)) {
          return "That swap doesn't fit your equipment or program anymore.";
        }
        const swaps = { ...profile.swaps, [swapKey(a.day_key, a.slot_index)]: a.exercise };
        saveProfile({ ...profile, swaps });
        setToast("Exercise swapped");
        return null;
      }
      case "change_program":
        if (state.active) return "Finish your current workout before switching programs.";
        if (!templateBySlug(a.program_slug)) return "That program doesn't exist.";
        saveProfile({ ...profile, programSlug: a.program_slug, swaps: {} });
        setToast("Program switched");
        return null;
      case "set_volume_targets":
        update((s) => ({ ...s, preset: a.preset }));
        setToast("Weekly targets updated");
        return null;
      case "log_food": {
        const entry = {
          id: crypto.randomUUID?.() ?? uid(),
          eatenAt: new Date().toISOString(),
          meal: a.meal,
          name: a.name,
          grams: a.grams || undefined,
          source: "coach" as const,
          macros: { calories: Math.round(a.calories), protein: a.protein, carbs: a.carbs, fat: a.fat },
        };
        update((s) => ({ ...s, food: [...s.food, entry] }));
        if (member) void cloud.saveFood(member, entry);
        setToast(`Logged ${entry.macros.calories} kcal`);
        return null;
      }
      case "remember":
        return null;
    }
  };
  const center = () => (state.active ? setShowWorkout(true) : start(nextDayKey(state.history)));

  return (
    <Frame>
      <main className="viewport">
        {tab === "today" && <Today state={state} onStart={start} onResume={() => setShowWorkout(true)} onProfile={() => setTab("profile")} onCoach={(prompt) => setCoach({ prompt })} />}
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
          onCoach={(prompt) => setCoach({ prompt })}
          onFinish={() => {
            const w = finishSession(state.active!);
            const before = state.history;
            update((s) => ({ ...s, active: null, history: [...s.history, w] }));
            setShowWorkout(false);
            setTab("today");
            setSummary({ workout: w, before });
          }}
        />
      )}

      {readinessFor && <ReadinessSheet dayKey={readinessFor} onStart={(r) => beginSession(readinessFor, r)} onClose={() => setReadinessFor(null)} />}

      {summary && (
        <WorkoutSummary
          workout={summary.workout}
          before={summary.before}
          onClose={() => setSummary(null)}
          onAskCoach={() => {
            setSummary(null);
            setCoach({ prompt: "I just finished my workout. How did it go, and what should I focus on next time?" });
          }}
        />
      )}

      {coach && (
        <Coach
          state={state}
          initialPrompt={coach.prompt}
          onClose={() => setCoach(null)}
          onMessages={(fn) => update((s) => ({ ...s, coach: { ...s.coach, chat: fn(s.coach.chat).slice(-60) } }))}
          onApply={applyCoachAction}
          onRemember={(note) => update((s) => ({ ...s, coach: { ...s.coach, memory: [...s.coach.memory, { id: uid(), note: note.slice(0, 160), at: new Date().toISOString() }].slice(-30) } }))}
          onForget={(id) => update((s) => ({ ...s, coach: { ...s.coach, memory: s.coach.memory.filter((m) => m.id !== id) } }))}
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
