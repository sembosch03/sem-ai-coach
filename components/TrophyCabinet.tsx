"use client";

import { useEffect, useMemo, useState } from "react";
import ActivityHeatmap from "@/components/ActivityHeatmap";

type Trophy = {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  detail: string;
  rarity?: string;
};

type Progress = {
  level: number;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  trophies: Trophy[];
  missions: Array<{ title: string; done: boolean; progress: string; xp: number }>;
};

export default function TrophyCabinet() {
  const [data, setData] = useState<Progress | null>(null);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  useEffect(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !d.error && setData(d))
      .catch(() => {});
  }, []);

  const trophies = useMemo(() => {
    if (!data) return [];
    if (filter === "unlocked") return data.trophies.filter((t) => t.unlocked);
    if (filter === "locked") return data.trophies.filter((t) => !t.unlocked);
    return data.trophies;
  }, [data, filter]);

  if (!data) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">Trofeeën laden…</div>;

  const unlocked = data.trophies.filter((t) => t.unlocked).length;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-amber-900/50 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-amber-400">TROPHY CABINET</p>
            <h1 className="mt-1 text-3xl font-bold">{unlocked}/{data.trophies.length} unlocked</h1>
            <p className="mt-2 text-sm text-zinc-400">Verdien ze door echte training, niet door op knopjes te drukken.</p>
          </div>
          <div className="rounded-2xl border border-violet-900 bg-violet-950/30 px-6 py-4">
            <p className="text-xs text-violet-300">CURRENT LEVEL</p>
            <p className="mt-1 text-3xl font-black">LVL {data.level}</p>
            <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (data.levelXp / data.nextLevelXp) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">{data.levelXp}/{data.nextLevelXp} XP naar volgende level</p>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        {(["all","unlocked","locked"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={"rounded-xl px-3 py-2 text-xs " + (filter === value ? "bg-white text-black" : "border border-zinc-800 bg-zinc-900 text-zinc-400")}
          >
            {value === "all" ? "Alles" : value === "unlocked" ? "Unlocked" : "Locked"}
          </button>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {trophies.map((trophy) => (
          <article
            key={trophy.id}
            className={
              "relative overflow-hidden rounded-2xl border p-5 " +
              (trophy.unlocked
                ? "border-amber-800/60 bg-amber-950/15"
                : "border-zinc-800 bg-zinc-900 opacity-70")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className={"text-4xl " + (!trophy.unlocked ? "grayscale" : "")}>{trophy.icon}</span>
              <span className="rounded-full bg-zinc-950 px-2 py-1 text-[9px] text-zinc-500">
                {trophy.unlocked ? "UNLOCKED" : `${Math.round(trophy.progress * 100)}%`}
              </span>
            </div>
            <h3 className="mt-4 font-semibold">{trophy.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{trophy.detail}</p>
            {!trophy.unlocked && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-amber-700" style={{ width: `${Math.round(trophy.progress * 100)}%` }} />
              </div>
            )}
          </article>
        ))}
      </section>

      <ActivityHeatmap />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs text-zinc-500">ACTIVE MISSIONS</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {data.missions.map((mission) => (
            <div key={mission.title} className={"rounded-xl border p-3 " + (mission.done ? "border-emerald-800 bg-emerald-950/20" : "border-zinc-800 bg-zinc-950")}>
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold">{mission.title}</p>
                <span className="text-xs text-violet-300">+{mission.xp} XP</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{mission.progress}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
