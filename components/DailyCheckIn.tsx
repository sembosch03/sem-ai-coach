"use client";

import { useEffect, useMemo, useState } from "react";

export type DailyCheckInData = {
  energy: number;
  legSoreness: number;
  shinPain: number;
  motivation: number;
  availableMinutes: number;
  note: string;
};

const defaults: DailyCheckInData = {
  energy: 7,
  legSoreness: 3,
  shinPain: 0,
  motivation: 7,
  availableMinutes: 75,
  note: "",
};

export default function DailyCheckIn({
  onChange,
}: {
  onChange?: (value: DailyCheckInData) => void;
}) {
  const [data, setData] = useState<DailyCheckInData>(defaults);

  useEffect(() => {
    const saved = localStorage.getItem("sem-daily-checkin");
    if (saved) {
      try {
        const parsed = { ...defaults, ...JSON.parse(saved) };
        setData(parsed);
        onChange?.(parsed);
      } catch {
        onChange?.(defaults);
      }
    } else {
      onChange?.(defaults);
    }
  }, [onChange]);

  const status = useMemo(() => {
    if (data.shinPain >= 7) {
      return {
        level: "RED",
        title: "Impact vandaag vermijden",
        text: "Geen hardlopen, springen of sprintwerk. Kies low-impact conditioning. Als pijn duidelijk toeneemt, je looppatroon verandert of je ook in rust pijn hebt: laat het beoordelen.",
      };
    }
    if (data.shinPain >= 4) {
      return {
        level: "AMBER",
        title: "Shins bewaken",
        text: "Conditioning liever low-impact (bike/elliptical/rower). Beperk hardloopvolume en stop als de pijn tijdens de sessie oploopt.",
      };
    }
    if (data.energy <= 4 || data.legSoreness >= 7) {
      return {
        level: "AMBER",
        title: "Herstelmodus",
        text: "Geen extra zware conditieprikkel. Hou gym gecontroleerd en kies eventueel rustige zone 2.",
      };
    }
    return {
      level: "GREEN",
      title: "Goede ruimte om te trainen",
      text: "Geen sterke alarmsignalen in je check-in. De coach kan conditie + gym normaal plannen.",
    };
  }, [data]);

  function update<K extends keyof DailyCheckInData>(key: K, value: DailyCheckInData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    localStorage.setItem("sem-daily-checkin", JSON.stringify(next));
    onChange?.(next);
  }

  const slider = (
    label: string,
    key: "energy" | "legSoreness" | "shinPain" | "motivation",
    minLabel: string,
    maxLabel: string
  ) => (
    <label className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold">{data[key]}/10</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={data[key]}
        onChange={(e) => update(key, Number(e.target.value))}
        className="mt-3 w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </label>
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">DAILY CHECK-IN</p>
          <h3 className="mt-1 text-lg font-semibold">Hoe staat je lichaam ervoor?</h3>
        </div>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (status.level === "GREEN"
              ? "bg-emerald-950 text-emerald-300"
              : status.level === "AMBER"
                ? "bg-amber-950 text-amber-300"
                : "bg-red-950 text-red-300")
          }
        >
          {status.level}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        {slider("Energie", "energy", "leeg", "top")}
        {slider("Benen spierpijn", "legSoreness", "fris", "heel stijf")}
        {slider("Shin pijn", "shinPain", "geen", "veel")}
        {slider("Motivatie", "motivation", "laag", "hoog")}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
          <span className="text-zinc-400">Tijd beschikbaar vandaag</span>
          <select
            value={data.availableMinutes}
            onChange={(e) => update("availableMinutes", Number(e.target.value))}
            className="mt-2 w-full rounded-lg bg-zinc-900 p-2 text-sm"
          >
            {[30,45,60,75,90,120].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>

        <label className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
          <span className="text-zinc-400">Extra context</span>
          <input
            value={data.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Bijv. slecht geslapen / stijve kuiten / drukke dag"
            className="mt-2 w-full rounded-lg bg-zinc-900 p-2 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs font-semibold text-zinc-300">{status.title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{status.text}</p>
      </div>
    </section>
  );
}
