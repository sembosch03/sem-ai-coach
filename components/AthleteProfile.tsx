"use client";

import { useEffect, useState } from "react";

type Profile = {
  displayName: string;
  team: string;
  position: string;
  age: number;
  heightCm: number;
  weightKg: number;
  primaryGoal: string;
  gymDaysTarget: number;
  footballDaysTarget: number;
  conditioningPriority: number;
};

const defaults: Profile = {
  displayName: "Sem",
  team: "SV Hoofddorp",
  position: "",
  age: 22,
  heightCm: 180,
  weightKg: 80,
  primaryGoal: "Voetbalconditie verbeteren en kracht/spiermassa behouden",
  gymDaysTarget: 5,
  footballDaysTarget: 2,
  conditioningPriority: 5,
};

export default function AthleteProfile() {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [level, setLevel] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/progress", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([p, progress]) => {
      if (p.profile) setProfile({ ...defaults, ...p.profile });
      if (!progress.error) {
        setLevel(progress.level);
        setXp(progress.xp);
      }
    }).catch(() => {
      const saved = localStorage.getItem("sem-athlete-profile");
      if (saved) {
        try { setProfile({ ...defaults, ...JSON.parse(saved) }); } catch {}
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    localStorage.setItem("sem-athlete-profile", JSON.stringify(profile));
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      setMessage(response.ok ? "Profiel opgeslagen." : data.error ?? "Opslaan mislukt.");
    } catch {
      setMessage("Lokaal opgeslagen.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-violet-900/50 bg-gradient-to-br from-violet-950/30 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white text-3xl font-black text-black">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-violet-300">ATHLETE PROFILE</p>
              <h1 className="mt-1 text-3xl font-bold">{profile.displayName}</h1>
              <p className="mt-1 text-sm text-zinc-500">{profile.team || "Geen team"}{profile.position ? ` · ${profile.position}` : ""}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-4 text-right">
            <p className="text-xs text-zinc-500">PERFORMANCE LEVEL</p>
            <p className="mt-1 text-3xl font-black">LVL {level ?? "--"}</p>
            <p className="text-xs text-violet-300">{xp ?? "--"} XP total</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-2">
          <p className="text-xs text-zinc-500">BASIS</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Naam"><input value={profile.displayName} onChange={(e) => update("displayName", e.target.value)} className="input" /></Field>
            <Field label="Team"><input value={profile.team} onChange={(e) => update("team", e.target.value)} className="input" /></Field>
            <Field label="Positie"><input value={profile.position} onChange={(e) => update("position", e.target.value)} placeholder="Bijv. winger / back" className="input" /></Field>
            <Field label="Leeftijd"><input type="number" value={profile.age} onChange={(e) => update("age", Number(e.target.value))} className="input" /></Field>
            <Field label="Lengte (cm)"><input type="number" value={profile.heightCm} onChange={(e) => update("heightCm", Number(e.target.value))} className="input" /></Field>
            <Field label="Gewicht (kg)"><input type="number" value={profile.weightKg} onChange={(e) => update("weightKg", Number(e.target.value))} className="input" /></Field>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">TRAINING DNA</p>
          <div className="mt-4 space-y-3">
            <Select label="Gymdagen doel" value={profile.gymDaysTarget} values={[3,4,5,6]} onChange={(v) => update("gymDaysTarget", v)} />
            <Select label="Voetbalprikkels" value={profile.footballDaysTarget} values={[1,2,3,4]} onChange={(v) => update("footballDaysTarget", v)} />
            <Select label="Conditie prioriteit" value={profile.conditioningPriority} values={[1,2,3,4,5]} onChange={(v) => update("conditioningPriority", v)} suffix="/5" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs text-zinc-500">PRIMARY GOAL</p>
        <textarea
          value={profile.primaryGoal}
          onChange={(e) => update("primaryGoal", e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none"
        />
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {saving ? "Opslaan…" : "Profiel opslaan"}
          </button>
          {message && <span className="text-xs text-zinc-500">{message}</span>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs text-zinc-500"><span>{label}</span><div className="mt-1">{children}</div></label>;
}

function Select({ label, value, values, onChange, suffix = "" }: { label: string; value: number; values: number[]; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-sm text-white">
        {values.map((v) => <option key={v} value={v}>{v}{suffix}</option>)}
      </select>
    </label>
  );
}
