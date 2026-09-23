"use client";

import { useEffect, useMemo, useState } from "react";

type Point = {
  date: string;
  sleepScore: number | null;
  sleepHours: number | null;
  hrv: number | null;
  restingHr: number | null;
  readiness: number | null;
  fitness: number | null;
  fatigue: number | null;
};

type Payload = {
  points: Point[];
  averages: {
    sleepScore: number | null;
    sleepHours: number | null;
    hrv: number | null;
    restingHr: number | null;
    readiness: number | null;
  };
};

function MiniBars({ values }: { values: Array<number | null> }) {
  const clean = values.filter((v): v is number => v !== null);
  const max = clean.length ? Math.max(...clean) : 1;
  const min = clean.length ? Math.min(...clean) : 0;
  const span = Math.max(1, max - min);

  return (
    <div className="mt-3 flex h-20 items-end gap-1">
      {values.map((value, i) => {
        const height = value === null ? 5 : 20 + ((value - min) / span) * 80;
        return <div key={i} className="min-w-0 flex-1 rounded-t bg-zinc-700" style={{ height: `${height}%` }} />;
      })}
    </div>
  );
}

export default function RecoveryLab() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/recovery", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !d.error && setData(d))
      .catch(() => {});
  }, []);

  const latest = useMemo(() => data?.points[data.points.length - 1] ?? null, [data]);

  if (!data) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">Recovery data laden…</div>;

  const cards = [
    { label: "Sleep score", value: data.averages.sleepScore, values: data.points.map((p) => p.sleepScore) },
    { label: "Sleep hours", value: data.averages.sleepHours, values: data.points.map((p) => p.sleepHours) },
    { label: "HRV", value: data.averages.hrv, values: data.points.map((p) => p.hrv) },
    { label: "Resting HR", value: data.averages.restingHr, values: data.points.map((p) => p.restingHr) },
  ];

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs text-emerald-400">RECOVERY LAB</p>
        <h1 className="mt-1 text-3xl font-bold">Hersteltrends</h1>
        <p className="mt-2 text-sm text-zinc-500">Kijk naar trends, niet naar één losse ochtend.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] text-zinc-500">{card.label.toUpperCase()} · 14D AVG</p>
            <p className="mt-1 text-2xl font-bold">{card.value ?? "--"}</p>
            <MiniBars values={card.values} />
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">LATEST SIGNALS</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Sleep" value={latest?.sleepScore ?? latest?.sleepHours ?? "--"} />
            <Stat label="HRV" value={latest?.hrv ?? "--"} />
            <Stat label="Rest HR" value={latest?.restingHr ?? "--"} />
            <Stat label="Readiness" value={latest?.readiness ?? "--"} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">COACH RULE</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Een enkele lage HRV- of slaapmeting verandert niet automatisch je hele week. De app gebruikt trends samen met je check-in, voetbalbelasting en spierpijn.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-[10px] text-zinc-600">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
