"use client";

import { useEffect, useState } from "react";

type Trophy = {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  detail: string;
};

export default function AchievementToast() {
  const [trophy, setTrophy] = useState<Trophy | null>(null);

  useEffect(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !Array.isArray(data.trophies)) return;

        const unlocked = (data.trophies as Trophy[]).filter((t) => t.unlocked);
        const stored = localStorage.getItem("sem-seen-trophies");

        if (!stored) {
          localStorage.setItem("sem-seen-trophies", JSON.stringify(unlocked.map((t) => t.id)));
          return;
        }

        let seen: string[] = [];
        try { seen = JSON.parse(stored); } catch {}
        const fresh = unlocked.find((t) => !seen.includes(t.id));

        if (fresh) {
          setTrophy(fresh);
          localStorage.setItem("sem-seen-trophies", JSON.stringify([...seen, ...unlocked.map((t) => t.id)]));
          window.setTimeout(() => setTrophy(null), 6500);
        }
      })
      .catch(() => {});
  }, []);

  if (!trophy) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-sm animate-pulse rounded-2xl border border-amber-700/60 bg-zinc-950 p-4 shadow-2xl shadow-amber-950/30">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{trophy.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-amber-400">TROPHY UNLOCKED</p>
          <p className="mt-1 font-bold text-white">{trophy.name}</p>
          <p className="mt-1 text-xs text-zinc-500">{trophy.detail}</p>
        </div>
        <button onClick={() => setTrophy(null)} className="text-zinc-600">✕</button>
      </div>
    </div>
  );
}
