"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AchievementToast from "@/components/AchievementToast";

type IconName = "home" | "match" | "progress" | "coach" | "more" | "recovery" | "goals" | "trophies" | "history" | "feedback" | "profile" | "settings";

function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></>,
    match: <><circle cx="12" cy="12" r="9"/><path d="m12 8 3 2-1 3h-4l-1-3 3-2Z"/><path d="m5 9 4 1M19 9l-4 1M8 18l2-5M16 18l-2-5"/></>,
    progress: <><path d="M4 18V6"/><path d="M4 18h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    coach: <><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 5 13V6.5Z"/><path d="M9 8h6M9 11h4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    recovery: <><path d="M7 4v4M17 4v4"/><path d="M5 8h14v11H5z"/><path d="M8 13h3M13 13h3"/></>,
    goals: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14 10 5-5"/></>,
    trophies: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/><path d="M12 13v5M9 20h6"/></>,
    history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M4 5v4h4"/></>,
    feedback: <><path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 9h8M8 13h5"/></>,
    profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.9 7L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2.1 1.6 2 3.4 2.4-1A7 7 0 0 0 10.4 18l.3 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const primary = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/match-center", label: "Match", icon: "match" as const },
  { href: "/progress", label: "Progress", icon: "progress" as const },
  { href: "/coach-chat", label: "Coach", icon: "coach" as const },
];

const secondary = [
  { href: "/recovery", label: "Recovery", icon: "recovery" as const, sub: "Slaap, HRV en herstel" },
  { href: "/goals", label: "Doelen", icon: "goals" as const, sub: "Wekelijkse targets" },
  { href: "/trophies", label: "Trofeeën", icon: "trophies" as const, sub: "Levels en achievements" },
  { href: "/history", label: "Historie", icon: "history" as const, sub: "Al je trainingen" },
  { href: "/feedback", label: "Feedback", icon: "feedback" as const, sub: "Hoe voelde je sessie?" },
  { href: "/profile", label: "Profiel", icon: "profile" as const, sub: "Jouw athlete setup" },
  { href: "/settings", label: "Instellingen", icon: "settings" as const, sub: "Integraties en privacy" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [level, setLevel] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setLevel(d.level);
          setXp(d.levelXp);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  const isSecondary = secondary.some((item) => pathname === item.href);

  return (
    <>
      <AchievementToast />
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link href="/" className="flex items-center gap-3">
            <div className="app-logo">S</div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-white">Sem Performance</p>
              <p className="text-[10px] text-zinc-500">Football performance</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {primary.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={active ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={isSecondary || moreOpen ? "app-nav-link app-nav-link-active" : "app-nav-link"}>
              <Icon name="more" />
              <span>Meer</span>
            </button>
          </nav>

          <Link href="/profile" className="app-level-pill">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white">{level ?? "—"}</span>
            <div className="hidden text-left sm:block">
              <p className="text-[10px] font-medium text-zinc-300">Level {level ?? "—"}</p>
              <p className="text-[9px] text-zinc-600">{xp !== null ? xp + "/500 XP" : "Laden..."}</p>
            </div>
          </Link>
        </div>

        {moreOpen && (
          <div className="app-more-panel hidden md:block">
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2 p-3 lg:grid-cols-4">
              {secondary.map((item) => (
                <Link key={item.href} href={item.href} className="app-more-item">
                  <span className="app-more-icon"><Icon name={item.icon} /></span>
                  <span>
                    <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                    <span className="block text-[10px] text-zinc-500">{item.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <nav className="app-bottom-nav md:hidden">
        {primary.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "app-bottom-link app-bottom-link-active" : "app-bottom-link"}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen((v) => !v)} className={isSecondary || moreOpen ? "app-bottom-link app-bottom-link-active" : "app-bottom-link"}>
          <Icon name="more" />
          <span>Meer</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-20 left-3 right-3 rounded-3xl border border-white/10 bg-zinc-950 p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <p className="text-sm font-semibold">Meer</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">Sluiten</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((item) => (
                <Link key={item.href} href={item.href} className="app-more-item">
                  <span className="app-more-icon"><Icon name={item.icon} /></span>
                  <span>
                    <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                    <span className="block text-[10px] text-zinc-500">{item.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
