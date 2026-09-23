"use client";

import { useEffect, useMemo, useState } from "react";

type Readiness = {
  readiness: number;
  status: string;
  signals: {
    sleepScore: number | null;
    sleepHours: number | null;
    hrv: number | null;
    restingHr: number | null;
  };
  checkIn: {
    energy: number;
    legSoreness: number;
    shinPain: number;
    motivation: number;
  };
};

type Tip = {
  icon: string;
  title: string;
  text: string;
  tag: string;
};

export default function SmartTips() {
  const [data, setData] = useState<Readiness | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/readiness", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !d.error && setData(d))
      .catch(() => {});
  }, []);

  const tips = useMemo<Tip[]>(() => {
    if (!data) return [];

    const result: Tip[] = [];

    if (data.checkIn.shinPain >= 4) {
      result.push({
        icon: "🦴",
        title: "Impact slim doseren",
        tag: "SHINS",
        text: "Kies voor extra conditie vandaag liever bike, elliptical of rower. Laat extra sprint- en loopwerk weg als de pijn oploopt.",
      });
    } else if (data.readiness >= 80 && data.checkIn.energy >= 7) {
      result.push({
        icon: "⚡",
        title: "Goede dag voor kwaliteit",
        tag: "TRAINING",
        text: "Herstel + energie staan gunstig. Als je weekplanning ruimte heeft, is dit eerder een dag voor je belangrijkste kwaliteitsprikkel dan voor zomaar extra volume.",
      });
    } else if (data.readiness < 60) {
      result.push({
        icon: "🔋",
        title: "Herstel eerst",
        tag: "RECOVERY",
        text: "Hou extra werk kort en beheerst. Rustige zone 2 of alleen je geplande hoofdtraining is vandaag vaak genoeg.",
      });
    }

    if ((data.signals.sleepScore ?? 100) < 65 || (data.signals.sleepHours ?? 8) < 6.5) {
      result.push({
        icon: "😴",
        title: "Slaap was je zwakke schakel",
        tag: "SLEEP",
        text: "Maak van vanavond een simpele win: vaste bedtijd, schermen wat eerder uit en geen onnodig late zware sessie als je morgen weer moet presteren.",
      });
    } else {
      result.push({
        icon: "🌙",
        title: "Bescherm je slaap",
        tag: "SLEEP",
        text: "Goede slaap is gratis performance. Probeer je sterke nachten te herhalen in plaats van alleen naar één hoge score te kijken.",
      });
    }

    result.push({
      icon: "🥤",
      title: "Voor zware voetbal/conditie",
      tag: "FUEL",
      text: "Ga niet leeg een zware sessie in: eet en drink normaal vooraf, en plan je zwaarste conditioning niet bovenop een zware beendag als dat niet nodig is.",
    });

    result.push({
      icon: "🎯",
      title: "Kwaliteit > extra volume",
      tag: "MINDSET",
      text: "Je hoeft niet elke dag méér te doen. De winst zit in weken achter elkaar goede voetbal-, conditie- en krachtsessies kunnen blijven uitvoeren.",
    });

    return result.slice(0, 4);
  }, [data]);

  if (!data) return null;

  const visible = open ? tips : tips.slice(0, 2);

  return (
    <section className="app-card mt-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="app-eyebrow">Slimme tips</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">Kleine wins voor vandaag</h2>
        </div>
        {tips.length > 2 && (
          <button onClick={() => setOpen((v) => !v)} className="rounded-full bg-white/[.045] px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
            {open ? "Minder" : "Meer"}
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {visible.map((tip) => (
          <article key={tip.title} className="app-card-soft flex gap-3 p-3.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.04] text-lg">{tip.icon}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-200">{tip.title}</p>
                <span className="text-[9px] font-medium text-zinc-600">{tip.tag}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{tip.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
