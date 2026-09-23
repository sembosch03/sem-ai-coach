"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Coach", icon: "⚡" },
  { href: "/match-center", label: "Match", icon: "⚽" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/recovery", label: "Recovery", icon: "💤" },
  { href: "/goals", label: "Goals", icon: "🎯" },
  { href: "/trophies", label: "Trophies", icon: "🏆" },
  { href: "/history", label: "History", icon: "🗓️" },
  { href: "/profile", label: "Profiel", icon: "👤" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [level, setLevel] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);

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

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg text-black">S</div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-white">SEM PERFORMANCE</p>
              <p className="text-[10px] text-zinc-500">Football Performance OS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    "rounded-xl px-3 py-2 text-xs transition " +
                    (active ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200")
                  }
                >
                  <span className="mr-1">{link.icon}</span>{link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl border border-violet-900/60 bg-violet-950/20 px-3 py-2"
          >
            <span className="text-lg">👤</span>
            <div className="text-left">
              <p className="text-[10px] text-violet-300">{level ? `LEVEL ${level}` : "LEVEL --"}</p>
              <p className="text-[9px] text-zinc-500">{xp !== null ? `${xp}/500 XP` : "laden..."}</p>
            </div>
          </Link>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "flex min-w-[62px] flex-col items-center rounded-lg px-1 py-1.5 text-[9px] " +
                  (active ? "bg-zinc-800 text-white" : "text-zinc-500")
                }
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
