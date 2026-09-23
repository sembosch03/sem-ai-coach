"use client";

import { useEffect, useState } from "react";

type Day = {
  day: string;
  focus: string;
  session: string;
  intensity: string;
  note: string;
};

type Payload = {
  mode?: "ai" | "fallback";
  summary?: string;
  week?: Day[];
  error?: string;
};

type Preferences = {
  tuesdayFootball: boolean;
  thursdayFootball: boolean;
  sundayMatch: boolean;
  gymDaysTarget: number;
  legDayTarget: number;
  extraNote: string;
};

const defaults: Preferences = {
  tuesdayFootball: true,
  thursdayFootball: true,
  sundayMatch: true,
  gymDaysTarget: 5,
  legDayTarget: 1,
  extraNote: "",
};

export default function AiWeekPlan() {
  const [data, setData] = useState<Payload | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences", { cache: "no-store" });
        const payload = await response.json();

        if (active && payload.preferences) {
          const next = { ...defaults, ...payload.preferences };
          setPreferences(next);
          await loadPlan(next);
        } else if (active) {
          setPreferences(defaults);
          await loadPlan(defaults);
        }
      } catch {
        const saved = localStorage.getItem("sem-coach-preferences");
        const next = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        if (active) {
          setPreferences(next);
          await loadPlan(next);
        }
      } finally {
        if (active) setReady(true);
      }
    }

    loadPreferences();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlan(nextPreferences = preferences) {
    setData(null);
    try {
      const response = await fetch("/api/week-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(nextPreferences),
      });
      setData(await response.json());
    } catch {
      setData({ error: "Weekplanner kon niet laden." });
    }
  }



  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function saveAndReplan() {
    localStorage.setItem("sem-coach-preferences", JSON.stringify(preferences));

    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
    } catch {
      // Local storage remains the fallback when cloud persistence is unavailable.
    }

    setSettingsOpen(false);
    loadPlan(preferences);
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">AI WEEKPLANNER</p>
          <h2 className="mt-1 text-2xl font-semibold">Komende 7 dagen</h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {!data ? "Laden…" : data.mode === "ai" ? "LIVE AI" : "SAFE FALLBACK"}
          </span>
          <button
            onClick={() => setSettingsOpen((open) => !open)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200"
          >
            Planning aanpassen
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Dinsdag voetbal", "tuesdayFootball"],
              ["Donderdag voetbal", "thursdayFootball"],
              ["Zondag wedstrijd", "sundayMatch"],
            ].map(([label, key]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-zinc-800 p-4 text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={preferences[key as keyof Preferences] as boolean}
                  onChange={(event) =>
                    update(key as "tuesdayFootball" | "thursdayFootball" | "sundayMatch", event.target.checked)
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}

            <label className="rounded-xl border border-zinc-800 p-4 text-sm">
              <span className="block text-zinc-400">Gymdagen doel</span>
              <select
                value={preferences.gymDaysTarget}
                onChange={(event) => update("gymDaysTarget", Number(event.target.value))}
                className="mt-2 w-full rounded-lg bg-zinc-900 p-2"
              >
                {[3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>{value} dagen</option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-zinc-800 p-4 text-sm">
              <span className="block text-zinc-400">Beendagen doel</span>
              <select
                value={preferences.legDayTarget}
                onChange={(event) => update("legDayTarget", Number(event.target.value))}
                className="mt-2 w-full rounded-lg bg-zinc-900 p-2"
              >
                {[0, 1, 2].map((value) => (
                  <option key={value} value={value}>{value} per week</option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-zinc-800 p-4 text-sm md:col-span-2 lg:col-span-1">
              <span className="block text-zinc-400">Extra voor deze week</span>
              <input
                value={preferences.extraNote}
                onChange={(event) => update("extraNote", event.target.value)}
                placeholder="Bijv. vrijdag geen tijd"
                className="mt-2 w-full rounded-lg bg-zinc-900 p-2 outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={saveAndReplan}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Opslaan + opnieuw plannen
            </button>
            <button
              onClick={() => setSettingsOpen(false)}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {data?.error ? (
        <p className="mt-5 text-sm text-red-300">{data.error}</p>
      ) : (
        <>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-400">
            {data?.summary ?? "De week wordt opgebouwd uit je herstel, recente belasting, voetbal en gym."}
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {(data?.week ?? Array.from({ length: 7 })).map((day, index) => (
              <div key={day ? day.day + index : index} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                {day ? (
                  <>
                    <p className="text-xs text-zinc-500">{day.day.toUpperCase()}</p>
                    <p className="mt-2 font-semibold">{day.focus}</p>
                    <p className="mt-3 text-sm text-zinc-300">{day.session}</p>
                    <p className="mt-3 text-xs text-emerald-400">{day.intensity}</p>
                    <p className="mt-3 text-xs leading-5 text-zinc-500">{day.note}</p>
                  </>
                ) : (
                  <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
