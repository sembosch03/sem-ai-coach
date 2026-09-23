"use client";

import { useEffect, useMemo, useState } from "react";

type Comparison = {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  unit: string;
};

type TrendPoint = {
  week: string;
  sessions: number;
  football: number;
  conditioning: number;
  minutes: number;
};

type RecordItem = {
  date: string;
  name: string;
  value: number;
} | null;

type ProgressionData = {
  current: {
    sessions: number;
    footballSessions: number;
    conditioningSessions: number;
    totalMinutes: number | null;
    avgFootballMinutes: number | null;
    avgFootballDistanceKm: number | null;
    avgFootballHr: number | null;
    avgFootballMaxHr: number | null;
    totalLoad: number | null;
  };
  previous: {
    sessions: number;
    footballSessions: number;
    conditioningSessions: number;
    totalMinutes: number | null;
    avgFootballMinutes: number | null;
    avgFootballDistanceKm: number | null;
    avgFootballHr: number | null;
    avgFootballMaxHr: number | null;
    totalLoad: number | null;
  };
  comparisons: Comparison[];
  records: {
    longestFootball: RecordItem;
    farthestFootball: RecordItem;
    biggestLoad: RecordItem;
  };
  weeklyTrend: TrendPoint[];
  signals: string[];
  challenge: {
    title: string;
    target: string;
    reason: string;
  };
  dataDepth: {
    activities: number;
    football: number;
    conditioning: number;
  };
};

function fmt(value: number | null, unit = "") {
  if (value === null) return "--";
  return `${value}${unit}`;
}

export default function ProgressionEngine() {
  const [data, setData] = useState<ProgressionData | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/api/progression", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.error) setData(payload);
      })
      .catch(() => {});
  }, []);

  const maxMinutes = useMemo(() => {
    if (!data?.weeklyTrend?.length) return 1;
    return Math.max(1, ...data.weeklyTrend.map((w) => w.minutes));
  }, [data]);

  if (!data) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs text-zinc-500">PROGRESSION ENGINE</p>
        <p className="mt-1 text-sm text-zinc-400">Progressie wordt geladen…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-cyan-300">PROGRESSION ENGINE</p>
          <h3 className="mt-1 text-lg font-semibold">Word je motor echt beter?</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Vergelijkt echte activiteiten. Geen AI-call nodig.
          </p>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs"
        >
          {open ? "Inklappen" : "Open progressie"}
        </button>
      </div>

      {open && (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.comparisons.map((item) => {
              const positive = item.change !== null && item.change > 0;
              const negative = item.change !== null && item.change < 0;
              return (
                <div key={item.key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-[10px] text-zinc-500">{item.label.toUpperCase()}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-lg font-semibold">{fmt(item.current, item.unit)}</p>
                    {item.change !== null && (
                      <span
                        className={
                          "text-xs font-medium " +
                          (positive
                            ? "text-emerald-400"
                            : negative
                              ? "text-amber-400"
                              : "text-zinc-500")
                        }
                      >
                        {item.change > 0 ? "+" : ""}
                        {Math.round(item.change)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    vorige: {fmt(item.previous, item.unit)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500">8-WEEK TRAINING TREND</p>
                  <p className="mt-1 text-sm font-medium">Trainingsminuten per week</p>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {data.dataDepth.activities} activiteiten in analyse
                </span>
              </div>

              <div className="mt-4 flex h-32 items-end gap-2">
                {data.weeklyTrend.map((week) => {
                  const height = Math.max(6, (week.minutes / maxMinutes) * 100);
                  return (
                    <div key={week.week} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full rounded-t-md bg-cyan-700/70"
                        style={{ height: `${height}%` }}
                        title={`${week.week}: ${week.minutes} min`}
                      />
                      <p className="mt-1 text-[9px] text-zinc-600">
                        {week.week.slice(5)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-violet-900 bg-violet-950/20 p-3">
              <p className="text-[10px] text-violet-300">NEXT CHALLENGE</p>
              <p className="mt-1 text-sm font-semibold">{data.challenge.title}</p>
              <p className="mt-2 text-xs text-zinc-300">{data.challenge.target}</p>
              <p className="mt-2 text-[10px] leading-4 text-zinc-500">{data.challenge.reason}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-[10px] text-zinc-500">LONGEST FOOTBALL</p>
              <p className="mt-1 text-sm font-semibold">
                {data.records.longestFootball
                  ? `${data.records.longestFootball.value} min`
                  : "--"}
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                {data.records.longestFootball?.date?.slice(0, 10) ?? "Nog geen data"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-[10px] text-zinc-500">FARTHEST FOOTBALL</p>
              <p className="mt-1 text-sm font-semibold">
                {data.records.farthestFootball
                  ? `${data.records.farthestFootball.value} km`
                  : "--"}
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                {data.records.farthestFootball?.date?.slice(0, 10) ?? "Nog geen data"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-[10px] text-zinc-500">BIGGEST LOAD</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {data.records.biggestLoad
                  ? `${data.records.biggestLoad.value} load`
                  : "--"}
              </p>
              <p className="mt-1 truncate text-[10px] text-zinc-600">
                {data.records.biggestLoad?.name ?? "Nog geen data"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[10px] text-emerald-400">COACH SIGNALS</p>
            <div className="mt-2 grid gap-1 md:grid-cols-2">
              {data.signals.map((signal) => (
                <p key={signal} className="text-xs text-zinc-300">
                  • {signal}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
