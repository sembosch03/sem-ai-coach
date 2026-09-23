"use client";

import { useEffect, useState } from "react";

type Plan = {
  status: string;
  primary: string;
  gym: string;
  conditioning: string;
  rpe: string;
  reasoning: string;
  tomorrow: string;
  confidence: string;
};

type Payload = {
  mode?: "ai" | "fallback";
  message?: string;
  plan?: Plan;
  error?: string;
};

export default function AiCoachPlan() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/coach-plan", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => active && setData(payload))
      .catch(() => active && setData({ error: "AI Coach kon niet laden." }));
    return () => {
      active = false;
    };
  }, []);

  if (!data) {
    return (
      <section className="mt-6 rounded-2xl border border-violet-900 bg-violet-950/20 p-6">
        <p className="text-sm text-violet-300">AI BRAIN</p>
        <h2 className="mt-2 text-2xl font-semibold">Plan wordt berekend…</h2>
      </section>
    );
  }

  if (data.error || !data.plan) {
    return (
      <section className="mt-6 rounded-2xl border border-red-900 bg-red-950/20 p-6">
        <p className="text-sm text-red-300">AI BRAIN · ERROR</p>
        <p className="mt-2 text-zinc-300">{data.error ?? "Geen plan beschikbaar."}</p>
      </section>
    );
  }

  const plan = data.plan;

  return (
    <section className="mt-6 rounded-2xl border border-violet-900 bg-violet-950/20 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-violet-300">
            AI BRAIN · {data.mode === "ai" ? "LIVE AI" : "SAFE FALLBACK"} · {plan.status}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{plan.primary}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-zinc-300">{plan.reasoning}</p>
        </div>
        <div className="rounded-xl border border-violet-900/70 bg-zinc-950/50 px-4 py-3 text-sm">
          Confidence: <span className="font-semibold">{plan.confidence}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">GYM</p>
          <p className="mt-2 text-sm text-zinc-200">{plan.gym}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">CONDITIONING</p>
          <p className="mt-2 text-sm text-zinc-200">{plan.conditioning}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">TARGET</p>
          <p className="mt-2 text-sm text-zinc-200">{plan.rpe}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">TOMORROW</p>
          <p className="mt-2 text-sm text-zinc-200">{plan.tomorrow}</p>
        </div>
      </div>

      {data.message && <p className="mt-4 text-xs text-zinc-500">{data.message}</p>}
    </section>
  );
}
