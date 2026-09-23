"use client";

import { useEffect, useMemo, useState } from "react";

function sundayKey() {
  const now = new Date();
  const day = now.getDay();
  const add = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + add);
  return sunday.toISOString().slice(0, 10);
}

export default function MatchPrepChecklist() {
  const key = sundayKey();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem(`sem-match-prep-${key}`);
    if (saved) {
      try { setChecked(JSON.parse(saved)); } catch {}
    }
  }, [key]);

  const daysUntil = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(key + "T00:00:00");
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  }, [key]);

  const items = useMemo(() => {
    if (daysUntil === 0) {
      return [
        { id: "fuel", text: "Normaal eten en drinken; ga niet leeg de wedstrijd in" },
        { id: "warmup", text: "Progressieve warming-up, niet meteen vol sprinten" },
        { id: "mind", text: "Eerste fase gecontroleerd: ritme pakken voor je extra acties forceert" },
        { id: "post", text: "Na afloop: feedback loggen zodat je coach ervan leert" },
      ];
    }
    if (daysUntil === 1) {
      return [
        { id: "nohard", text: "Geen extra harde conditioning of zware beendag" },
        { id: "easy", text: "Hou bewegen licht en zorg dat je benen fris worden" },
        { id: "sleep", text: "Maak slaap vannacht prioriteit" },
        { id: "plan", text: "Check je spullen, timing en wedstrijddag vooraf" },
      ];
    }
    return [
      { id: "quality", text: "Belangrijkste conditioningsprikkel vroeg genoeg in de week" },
      { id: "legs", text: "Zware benen niet opstapelen vlak voor zondag" },
      { id: "football", text: "Minimaal één voetbal-specifieke prikkel behouden" },
      { id: "sleep", text: "Slaaptrend beschermen in plaats van zaterdag alles te repareren" },
    ];
  }, [daysUntil]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(`sem-match-prep-${key}`, JSON.stringify(next));
  }

  const done = items.filter((item) => checked[item.id]).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">MATCH PREP</p>
          <h3 className="mt-1 text-lg font-semibold">
            {daysUntil === 0 ? "Matchday" : `${daysUntil} dag${daysUntil === 1 ? "" : "en"} tot zondag`}
          </h3>
        </div>
        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-500">{done}/{items.length}</span>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={
              "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm " +
              (checked[item.id] ? "border-emerald-900 bg-emerald-950/20 text-zinc-500" : "border-zinc-800 bg-zinc-950 text-zinc-300")
            }
          >
            <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs " + (checked[item.id] ? "border-emerald-600 bg-emerald-600 text-black" : "border-zinc-700")}>
              {checked[item.id] ? "✓" : ""}
            </span>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
