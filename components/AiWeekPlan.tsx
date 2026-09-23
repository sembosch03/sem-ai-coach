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

export default function AiWeekPlan() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/week-plan", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => active && setData(payload))
      .catch(() => active && setData({ error: "Weekplanner kon niet laden." }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">AI WEEKPLANNER</p>
          <h2 className="mt-1 text-2xl font-semibold">Komende 7 dagen</h2>
        </div>
        <span className="text-sm text-zinc-500">
          {!data ? "Laden…" : data.mode === "ai" ? "LIVE AI" : "SAFE FALLBACK"}
        </span>
      </div>

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
