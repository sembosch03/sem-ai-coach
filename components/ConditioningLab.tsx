"use client";

import type { DailyCheckInData } from "@/components/DailyCheckIn";

type Session = {
  id: string;
  name: string;
  goal: string;
  protocol: string;
  when: string;
  impact: "low" | "medium" | "high";
};

const sessions: Session[] = [
  {
    id: "z2",
    name: "Zone 2 Base",
    goal: "Aerobe basis + sneller herstellen tussen acties",
    protocol: "30-45 min rustig. Praattempo / ongeveer Z2. Geen sprintjes.",
    when: "Goed op gymdagen of na lichte voetbalweek.",
    impact: "low",
  },
  {
    id: "4x4",
    name: "4x4 Engine",
    goal: "VO₂ / wedstrijdmotor",
    protocol: "10 min warm-up → 4×4 min hard → 3 min rustig tussen blokken → 8 min cool-down.",
    when: "1x per week als benen fris zijn en geen wedstrijd binnen 48u.",
    impact: "high",
  },
  {
    id: "30-30",
    name: "Football 30/30",
    goal: "Herhaald hard werk voor voetbal",
    protocol: "2 sets van 6×30 sec hard / 30 sec rustig. 3 min setrust. Totaal kort houden.",
    when: "Alleen als shins en benen goed voelen.",
    impact: "high",
  },
  {
    id: "bike",
    name: "Low-Impact Engine",
    goal: "Conditie verbeteren met weinig scheen-impact",
    protocol: "Bike/elliptical: 8×1 min stevig / 1 min rustig + 10-15 min easy.",
    when: "Beste alternatief bij gevoelige shins.",
    impact: "low",
  },
];

export default function ConditioningLab({ checkIn }: { checkIn: DailyCheckInData }) {
  const recommended =
    checkIn.shinPain >= 4
      ? "bike"
      : checkIn.energy <= 4 || checkIn.legSoreness >= 7
        ? "z2"
        : checkIn.energy >= 7 && checkIn.legSoreness <= 4
          ? "4x4"
          : "z2";

  return (
    <section className="rounded-2xl border border-emerald-900/70 bg-emerald-950/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-emerald-400">CONDITIONING LAB</p>
          <h3 className="mt-1 text-lg font-semibold">Bouw je voetbalmotor</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Concrete sessies zonder extra AI-call. Kies ze alleen als ze naast voetbal en herstel passen.
          </p>
        </div>
        <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-300">
          Advies: {sessions.find((s) => s.id === recommended)?.name}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {sessions.map((session) => {
          const blocked = checkIn.shinPain >= 7 && session.impact === "high";
          const preferred = session.id === recommended;

          return (
            <div
              key={session.id}
              className={
                "rounded-xl border p-3 " +
                (blocked
                  ? "border-red-900 bg-red-950/20 opacity-70"
                  : preferred
                    ? "border-emerald-700 bg-emerald-950/20"
                    : "border-zinc-800 bg-zinc-950")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{session.name}</p>
                {preferred && !blocked && (
                  <span className="text-[10px] font-semibold text-emerald-400">BESTE FIT</span>
                )}
                {blocked && (
                  <span className="text-[10px] font-semibold text-red-300">SKIP IMPACT</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{session.goal}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-300">{session.protocol}</p>
              <p className="mt-2 text-[10px] leading-4 text-zinc-600">{session.when}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
