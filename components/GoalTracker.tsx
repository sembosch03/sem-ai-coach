"use client";

import { useEffect, useState } from "react";

type Progress = {
  stats: {
    activities7: number;
    football7: number;
    conditioning7: number;
    totalMinutes7: number;
    distanceKm7: number;
  };
};

type Targets = {
  sessions: number;
  football: number;
  conditioning: number;
  minutes: number;
};

const defaults: Targets = {
  sessions: 5,
  football: 2,
  conditioning: 3,
  minutes: 240,
};

export default function GoalTracker() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [targets, setTargets] = useState<Targets>(defaults);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !d.error && setProgress(d))
      .catch(() => {});

    const saved = localStorage.getItem("sem-week-goals");
    if (saved) {
      try { setTargets({ ...defaults, ...JSON.parse(saved) }); } catch {}
    }
  }, []);

  function save() {
    localStorage.setItem("sem-week-goals", JSON.stringify(targets));
    setEditing(false);
  }

  if (!progress) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">Goals laden…</div>;

  const items = [
    { key: "sessions", label: "Totale sessies", current: progress.stats.activities7, target: targets.sessions, icon: "⚡" },
    { key: "football", label: "Voetbalprikkels", current: progress.stats.football7, target: targets.football, icon: "⚽" },
    { key: "conditioning", label: "Conditieprikkels", current: progress.stats.conditioning7, target: targets.conditioning, icon: "🫁" },
    { key: "minutes", label: "Trainingsminuten", current: progress.stats.totalMinutes7, target: targets.minutes, icon: "⏱️" },
  ] as const;

  const completed = items.filter((item) => item.current >= item.target).length;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/25 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-emerald-400">WEEKLY OBJECTIVES</p>
            <h1 className="mt-1 text-3xl font-bold">{completed}/4 goals geraakt</h1>
            <p className="mt-2 text-sm text-zinc-500">Stuur op consistentie, niet op perfecte dagen.</p>
          </div>
          <button onClick={() => setEditing((v) => !v)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
            Doelen aanpassen
          </button>
        </div>
      </section>

      {editing && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(targets) as Array<keyof Targets>).map((key) => (
              <label key={key} className="text-xs text-zinc-500">
                {key === "sessions" ? "Sessies" : key === "football" ? "Voetbal" : key === "conditioning" ? "Conditie" : "Minuten"}
                <input
                  type="number"
                  value={targets[key]}
                  onChange={(e) => setTargets((t) => ({ ...t, [key]: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-white"
                />
              </label>
            ))}
          </div>
          <button onClick={save} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Opslaan</button>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const pct = Math.min(100, Math.round((item.current / Math.max(1, item.target)) * 100));
          const done = item.current >= item.target;
          return (
            <article key={item.key} className={"rounded-2xl border p-5 " + (done ? "border-emerald-800 bg-emerald-950/15" : "border-zinc-800 bg-zinc-900")}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl">{item.icon}</p>
                  <p className="mt-2 text-sm font-semibold">{item.label}</p>
                </div>
                <span className={"rounded-full px-2 py-1 text-[10px] " + (done ? "bg-emerald-950 text-emerald-300" : "bg-zinc-950 text-zinc-500")}>
                  {done ? "COMPLETE" : `${pct}%`}
                </span>
              </div>
              <p className="mt-5 text-3xl font-black">{item.current}<span className="text-sm font-normal text-zinc-600"> / {item.target}</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
