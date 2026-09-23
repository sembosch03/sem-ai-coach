"use client";

import { useEffect, useMemo, useState } from "react";

type Activity = {
  id: string;
  date: string;
  name: string;
  sport: string;
  source: string;
  load: number | null;
  durationMin: number | null;
  distanceKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
};

export default function TrainingHistory() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "football" | "conditioning">("all");

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.activities && setActivities(d.activities))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const text = `${a.name} ${a.sport}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "football") return /football|soccer|voetbal/.test(text);
      if (filter === "conditioning") return /run|running|cardio|cycle|cycling|bike|row|football|soccer|voetbal/.test(text);
      return true;
    });
  }, [activities, query, filter]);

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs text-zinc-500">TRAINING LOG</p>
        <h1 className="mt-1 text-3xl font-bold">History</h1>
        <p className="mt-2 text-sm text-zinc-500">{activities.length} activiteiten geladen</p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:flex-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek training..." className="min-w-0 flex-1 rounded-xl bg-zinc-950 px-3 py-2 text-sm outline-none" />
        <div className="flex gap-2">
          {(["all","football","conditioning"] as const).map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={"rounded-xl px-3 py-2 text-xs " + (filter === value ? "bg-white text-black" : "border border-zinc-800 text-zinc-400")}>
              {value === "all" ? "Alles" : value === "football" ? "Voetbal" : "Conditie"}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        {filtered.map((activity) => (
          <article key={activity.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{activity.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{activity.date.slice(0, 10)} · {activity.source}</p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-right">
                <Stat label="MIN" value={activity.durationMin ?? "--"} />
                <Stat label="KM" value={activity.distanceKm ?? "--"} />
                <Stat label="AVG HR" value={activity.avgHr ? Math.round(activity.avgHr) : "--"} />
                <Stat label="LOAD" value={activity.load ? Math.round(activity.load) : "--"} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-[9px] text-zinc-600">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>;
}
