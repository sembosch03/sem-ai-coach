"use client";

import { useEffect, useState } from "react";
import MatchPrepChecklist from "@/components/MatchPrepChecklist";

type Readiness = {
  readiness: number;
  footballReadiness: number;
  conditioningScore: number;
  status: string;
  recommendation: string;
  factors: Array<{ label: string; impact: number; text: string }>;
  signals: {
    sleepScore: number | null;
    sleepHours: number | null;
    hrv: number | null;
    restingHr: number | null;
    fitness: number | null;
    fatigue: number | null;
    form: number | null;
  };
  checkIn: {
    energy: number;
    legSoreness: number;
    shinPain: number;
    motivation: number;
  };
  disclaimer: string;
};

function Ring({ value, label }: { value: number; label: string }) {
  const angle = Math.round((value / 100) * 360);
  return (
    <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(currentColor ${angle}deg, #27272a ${angle}deg)` }}>
      <div className="grid h-28 w-28 place-items-center rounded-full bg-zinc-950 text-center">
        <div>
          <p className="text-3xl font-black">{value}</p>
          <p className="text-[10px] text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function MatchCenter() {
  const [data, setData] = useState<Readiness | null>(null);

  useEffect(() => {
    fetch("/api/readiness", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !d.error && setData(d))
      .catch(() => {});
  }, []);

  if (!data) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">Readiness laden…</div>;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-violet-900/50 bg-gradient-to-br from-violet-950/30 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-violet-300">MATCH CENTER</p>
            <h1 className="mt-1 text-3xl font-bold">Vandaag: {data.status}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{data.recommendation}</p>
          </div>
          <div className="flex flex-wrap gap-5 text-violet-400">
            <Ring value={data.footballReadiness} label="FOOTBALL READY" />
            <div className="text-cyan-400"><Ring value={data.conditioningScore} label="ENGINE SCORE" /></div>
            <div className="text-emerald-400"><Ring value={data.readiness} label="RECOVERY" /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.factors.map((factor) => (
          <div key={factor.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">{factor.label.toUpperCase()}</p>
              <span className={"text-xs font-semibold " + (factor.impact > 0 ? "text-emerald-400" : factor.impact < 0 ? "text-amber-400" : "text-zinc-500")}>
                {factor.impact > 0 ? "+" : ""}{factor.impact}
              </span>
            </div>
            <p className="mt-2 text-sm">{factor.text}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">BODY SIGNALS</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><p className="text-[10px] text-zinc-600">ENERGY</p><p className="mt-1 text-xl font-semibold">{data.checkIn.energy}/10</p></div>
            <div><p className="text-[10px] text-zinc-600">LEGS</p><p className="mt-1 text-xl font-semibold">{data.checkIn.legSoreness}/10</p></div>
            <div><p className="text-[10px] text-zinc-600">SHINS</p><p className="mt-1 text-xl font-semibold">{data.checkIn.shinPain}/10</p></div>
            <div><p className="text-[10px] text-zinc-600">MOTIVATION</p><p className="mt-1 text-xl font-semibold">{data.checkIn.motivation}/10</p></div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">RECOVERY DATA</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><p className="text-[10px] text-zinc-600">SLEEP</p><p className="mt-1 text-xl font-semibold">{data.signals.sleepScore ?? data.signals.sleepHours ?? "--"}</p></div>
            <div><p className="text-[10px] text-zinc-600">HRV</p><p className="mt-1 text-xl font-semibold">{data.signals.hrv ?? "--"}</p></div>
            <div><p className="text-[10px] text-zinc-600">FORM</p><p className="mt-1 text-xl font-semibold">{data.signals.form !== null ? Math.round(data.signals.form) : "--"}</p></div>
            <div><p className="text-[10px] text-zinc-600">FITNESS</p><p className="mt-1 text-xl font-semibold">{data.signals.fitness !== null ? Math.round(data.signals.fitness) : "--"}</p></div>
          </div>
        </div>
      </section>

      <MatchPrepChecklist />

      <p className="text-[10px] text-zinc-600">{data.disclaimer}</p>
    </div>
  );
}
