"use client";

import { useEffect, useMemo, useState } from "react";
import DailyCheckIn, { type DailyCheckInData } from "@/components/DailyCheckIn";

type DayMode = "auto" | "gym" | "football" | "gym_football" | "match" | "rest" | "unavailable";

type DayChoice = {
  mode: DayMode;
  note: string;
};

type PlanDay = {
  day: string;
  primary: string;
  gymFocus: string;
  conditioning: string;
  orderAdvice: string;
  intensity: string;
  tip: string;
};

type Plan = {
  headline: string;
  weeklyFocus: string;
  coachTip: string;
  days: PlanDay[];
};

type Review = {
  title: string;
  wins: string[];
  improve: string[];
  football: string;
  conditioning: string;
  motivation: string;
};

type Progress = {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  stats: {
    activities7: number;
    football7: number;
    conditioning7: number;
    totalMinutes7: number;
    distanceKm7: number;
  };
  trophies: Array<{
    id: string;
    name: string;
    icon: string;
    unlocked: boolean;
    progress: number;
    detail: string;
  }>;
};

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const defaultChoices: Record<string, DayChoice> = Object.fromEntries(
  days.map((day) => [
    day,
    {
      mode:
        day === "Tuesday" || day === "Thursday"
          ? "football"
          : day === "Sunday"
            ? "match"
            : "auto",
      note: "",
    },
  ])
);

const modeLabels: Record<DayMode, string> = {
  auto: "AI kiest",
  gym: "Gym",
  football: "Voetbal",
  gym_football: "Gym + voetbal",
  match: "Wedstrijd",
  rest: "Rust",
  unavailable: "Niet beschikbaar",
};

function weekKey() {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const d = local.getDay();
  local.setDate(local.getDate() + (d === 0 ? -6 : 1 - d));
  return local.toISOString().slice(0, 10);
}

function todayName() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
  }).format(new Date());
}

export default function PerformanceOS() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, DayChoice>>(defaultChoices);
  const [gymDaysTarget, setGymDaysTarget] = useState(5);
  const [legDayTarget, setLegDayTarget] = useState(1);
  const [conditioningPriority, setConditioningPriority] = useState(5);
  const [checkIn, setCheckIn] = useState<DailyCheckInData>({
    energy: 7,
    legSoreness: 3,
    shinPain: 0,
    motivation: 7,
    availableMinutes: 75,
    note: "",
  });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayName());
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const key = weekKey();
    const localPlan = localStorage.getItem(`sem-performance-plan-${key}`);
    const localChoices = localStorage.getItem("sem-performance-choices");
    const localTargets = localStorage.getItem("sem-performance-targets");
    const localReview = localStorage.getItem(`sem-week-review-${key}`);

    fetch("/api/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setProgress(data);
      })
      .catch(() => {});

    if (localPlan) {
      try {
        const parsed = JSON.parse(localPlan);
        setPlan(parsed.plan ?? parsed);
        setGeneratedAt(parsed.generatedAt ?? null);
      } catch {}
    }

    if (localChoices) {
      try {
        setChoices({ ...defaultChoices, ...JSON.parse(localChoices) });
      } catch {}
    }

    if (localTargets) {
      try {
        const parsed = JSON.parse(localTargets);
        setGymDaysTarget(parsed.gymDaysTarget ?? 5);
        setLegDayTarget(parsed.legDayTarget ?? 1);
        setConditioningPriority(parsed.conditioningPriority ?? 5);
      } catch {}
    }

    if (localReview) {
      try {
        setReview(JSON.parse(localReview));
      } catch {}
    }

    if (!localPlan) {
      fetch("/api/performance-plan", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data.cached?.plan) {
            setPlan(data.cached.plan);
            setGeneratedAt(data.cached.generatedAt ?? null);
            localStorage.setItem(
              `sem-performance-plan-${key}`,
              JSON.stringify({
                plan: data.cached.plan,
                generatedAt: data.cached.generatedAt ?? null,
              })
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  const selected = useMemo(
    () => plan?.days.find((day) => day.day === selectedDay) ?? null,
    [plan, selectedDay]
  );

  async function generate(force = false) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/performance-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: choices,
          gymDaysTarget,
          legDayTarget,
          conditioningPriority,
          checkIn,
          force,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.plan) {
        setMessage(data.error ?? "Plan kon niet worden gemaakt.");
        return;
      }

      const nextPlan = data.plan as Plan;
      const nextGeneratedAt = data.generatedAt ?? new Date().toISOString();
      setPlan(nextPlan);
      setGeneratedAt(nextGeneratedAt);
      localStorage.setItem(
        `sem-performance-plan-${weekKey()}`,
        JSON.stringify({ plan: nextPlan, generatedAt: nextGeneratedAt })
      );
      localStorage.setItem("sem-performance-choices", JSON.stringify(choices));
      localStorage.setItem(
        "sem-performance-targets",
        JSON.stringify({ gymDaysTarget, legDayTarget, conditioningPriority })
      );
      setEditing(false);
      setMessage(data.mode === "cached" ? "Bestaand weekplan geladen — 0 extra AI-call." : "Nieuw weekplan gemaakt.");
    } catch {
      setMessage("Plan kon niet worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  async function generateReview() {
    setReviewLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/week-summary", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.review) {
        setMessage(data.error ?? "Weekreview kon niet worden gemaakt.");
        return;
      }
      setReview(data.review);
      localStorage.setItem(`sem-week-review-${weekKey()}`, JSON.stringify(data.review));
    } catch {
      setMessage("Weekreview kon niet worden gemaakt.");
    } finally {
      setReviewLoading(false);
    }
  }

  function updateChoice(day: string, patch: Partial<DayChoice>) {
    setChoices((current) => ({
      ...current,
      [day]: { ...current[day], ...patch },
    }));
  }

  return (
    <div className="mt-5 space-y-4">
      <DailyCheckIn onChange={setCheckIn} />

      {progress && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-zinc-500">LEVEL & TROPHIES</p>
              <div className="mt-1 flex items-baseline gap-3">
                <h3 className="text-xl font-semibold">Level {progress.level}</h3>
                <span className="text-xs text-zinc-500">{progress.xp} XP totaal</span>
              </div>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{progress.levelXp} XP</span>
                <span>{progress.nextLevelXp} XP</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.min(100, (progress.levelXp / progress.nextLevelXp) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {progress.trophies.map((trophy) => (
              <div
                key={trophy.id}
                className={
                  "rounded-xl border p-3 " +
                  (trophy.unlocked
                    ? "border-amber-700/60 bg-amber-950/20"
                    : "border-zinc-800 bg-zinc-950 opacity-60")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{trophy.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{trophy.name}</p>
                    <p className="text-[10px] text-zinc-500">{trophy.detail}</p>
                  </div>
                </div>
                {!trophy.unlocked && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-600"
                      style={{ width: `${Math.round(trophy.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
            <span>{progress.stats.activities7} sessies / 7d</span>
            <span>•</span>
            <span>{progress.stats.football7} voetbal</span>
            <span>•</span>
            <span>{progress.stats.conditioning7} conditieprikkels</span>
            <span>•</span>
            <span>{progress.stats.totalMinutes7} min</span>
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-violet-300">PERFORMANCE OS</p>
            <h2 className="mt-1 text-xl font-semibold">
              {plan?.headline ?? "Maak je week één keer — daarna blijft hij staan"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {plan?.weeklyFocus ?? "AI wordt alleen aangeroepen wanneer jij Genereer of Herplan kiest."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditing((value) => !value)}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm"
            >
              Week aanpassen
            </button>
            <button
              onClick={() => generate(Boolean(plan))}
              disabled={loading}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {loading ? "AI plant…" : plan ? "Herplan week" : "Genereer week"}
            </button>
          </div>
        </div>

        {generatedAt && (
          <p className="mt-3 text-xs text-zinc-600">
            Laatst gemaakt: {new Date(generatedAt).toLocaleString("nl-NL")}
          </p>
        )}

        {editing && (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4 flex flex-wrap gap-3">
              <label className="text-xs text-zinc-400">
                Gymdagen
                <select
                  value={gymDaysTarget}
                  onChange={(e) => setGymDaysTarget(Number(e.target.value))}
                  className="ml-2 rounded-lg bg-zinc-900 px-2 py-1 text-white"
                >
                  {[3,4,5,6].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Beendagen
                <select
                  value={legDayTarget}
                  onChange={(e) => setLegDayTarget(Number(e.target.value))}
                  className="ml-2 rounded-lg bg-zinc-900 px-2 py-1 text-white"
                >
                  {[0,1,2].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Conditie prioriteit
                <select
                  value={conditioningPriority}
                  onChange={(e) => setConditioningPriority(Number(e.target.value))}
                  className="ml-2 rounded-lg bg-zinc-900 px-2 py-1 text-white"
                >
                  {[1,2,3,4,5].map((n) => (
                    <option key={n} value={n}>{n}/5</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
              {days.map((day) => (
                <div key={day} className="rounded-xl border border-zinc-800 p-3">
                  <p className="text-xs font-medium text-zinc-400">{day.slice(0,3).toUpperCase()}</p>
                  <select
                    value={choices[day].mode}
                    onChange={(e) => updateChoice(day, { mode: e.target.value as DayMode })}
                    className="mt-2 w-full rounded-lg bg-zinc-900 p-2 text-xs"
                  >
                    {(Object.keys(modeLabels) as DayMode[]).map((mode) => (
                      <option key={mode} value={mode}>{modeLabels[mode]}</option>
                    ))}
                  </select>
                  <input
                    value={choices[day].note}
                    onChange={(e) => updateChoice(day, { note: e.target.value })}
                    placeholder="Festival / geen tijd…"
                    className="mt-2 w-full rounded-lg bg-zinc-900 p-2 text-xs outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              Voorbeeld: zaterdag → Niet beschikbaar → “festival”. Zondag → Wedstrijd. De AI past de rest van de week daarop aan.
            </p>
          </div>
        )}

        {message && <p className="mt-3 text-xs text-zinc-400">{message}</p>}
      </section>

      {plan && (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
              {plan.days.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedDay === day.day
                      ? "border-violet-600 bg-violet-950/30"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <p className="text-[10px] text-zinc-500">{day.day.slice(0,3).toUpperCase()}</p>
                  <p className="mt-1 truncate text-sm font-medium">{day.primary}</p>
                  <p className="mt-1 text-[10px] text-emerald-400">{day.intensity}</p>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-violet-900 bg-violet-950/20 p-4 lg:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-violet-300">{selected.day.toUpperCase()}</p>
                    <h3 className="mt-1 text-xl font-semibold">{selected.primary}</h3>
                  </div>
                  <span className="rounded-lg bg-zinc-950 px-3 py-1 text-xs">{selected.intensity}</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-zinc-950 p-3">
                    <p className="text-[10px] text-zinc-500">GYM</p>
                    <p className="mt-1 text-sm">{selected.gymFocus}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-3">
                    <p className="text-[10px] text-zinc-500">VOLGORDE</p>
                    <p className="mt-1 text-sm">{selected.orderAdvice}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-4">
                <p className="text-xs text-emerald-400">CONDITIONING</p>
                <p className="mt-2 text-sm leading-6 text-zinc-200">{selected.conditioning}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-500">COACH TIP</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{selected.tip}</p>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">WEEK COACH TIP</p>
                <p className="mt-1 text-sm text-zinc-300">{plan.coachTip}</p>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">WEEK REVIEW</p>
            <h3 className="mt-1 text-lg font-semibold">
              {review?.title ?? "Wat ging beter deze week?"}
            </h3>
          </div>
          <button
            onClick={generateReview}
            disabled={reviewLoading}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            {reviewLoading ? "Analyseren…" : review ? "Ververs review" : "Maak review"}
          </button>
        </div>

        {review && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-zinc-950 p-3">
              <p className="text-[10px] text-emerald-400">WINS</p>
              {review.wins.map((item) => <p key={item} className="mt-1 text-xs text-zinc-300">• {item}</p>)}
            </div>
            <div className="rounded-xl bg-zinc-950 p-3">
              <p className="text-[10px] text-amber-400">VOLGENDE STAP</p>
              {review.improve.map((item) => <p key={item} className="mt-1 text-xs text-zinc-300">• {item}</p>)}
            </div>
            <div className="rounded-xl bg-zinc-950 p-3">
              <p className="text-[10px] text-zinc-500">VOETBAL / CONDITIE</p>
              <p className="mt-1 text-xs text-zinc-300">{review.football}</p>
              <p className="mt-2 text-xs text-zinc-500">{review.conditioning}</p>
            </div>
            <div className="rounded-xl bg-zinc-950 p-3">
              <p className="text-[10px] text-violet-300">MOTIVATIE</p>
              <p className="mt-1 text-xs leading-5 text-zinc-300">{review.motivation}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
