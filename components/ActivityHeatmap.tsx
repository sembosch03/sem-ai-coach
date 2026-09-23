"use client";

import { useEffect, useMemo, useState } from "react";

type Activity = { date: string };

export default function ActivityHeatmap() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.activities && setActivities(d.activities))
      .catch(() => {});
  }, []);

  const cells = useMemo(() => {
    const counts = new Map<string, number>();
    for (const activity of activities) {
      const key = activity.date.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const result: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return result;
  }, [activities]);

  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">84-DAY CONSISTENCY MAP</p>
          <h3 className="mt-1 text-lg font-semibold">{activeDays} actieve dagen</h3>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-zinc-600">
          <span>rust</span>
          {[0,1,2,3].map((n) => (
            <span
              key={n}
              className={
                "h-3 w-3 rounded-sm " +
                (n === 0 ? "bg-zinc-800" : n === 1 ? "bg-emerald-950" : n === 2 ? "bg-emerald-800" : "bg-emerald-500")
              }
            />
          ))}
          <span>hard</span>
        </div>
      </div>

      <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.date}: ${cell.count} activiteit(en)`}
            className={
              "h-4 w-4 rounded-sm " +
              (cell.count === 0
                ? "bg-zinc-800"
                : cell.count === 1
                  ? "bg-emerald-950"
                  : cell.count === 2
                    ? "bg-emerald-800"
                    : "bg-emerald-500")
            }
          />
        ))}
      </div>
    </section>
  );
}
