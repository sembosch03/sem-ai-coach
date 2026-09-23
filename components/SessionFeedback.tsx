"use client";

import { useEffect, useState } from "react";

type Entry = {
  date: string;
  sessionName: string;
  rpe: number;
  breathlessness: number;
  legs: number;
  quality: number;
  note: string;
};

const today = new Date().toISOString().slice(0, 10);

export default function SessionFeedback() {
  const [form, setForm] = useState<Entry>({
    date: today,
    sessionName: "Voetbal / Gym / Conditioning",
    rpe: 6,
    breathlessness: 5,
    legs: 5,
    quality: 7,
    note: "",
  });
  const [recent, setRecent] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/feedback", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.feedback && setRecent(d.feedback))
      .catch(() => {
        const local = localStorage.getItem("sem-session-feedback");
        if (local) {
          try { setRecent(JSON.parse(local)); } catch {}
        }
      });
  }, []);

  async function save() {
    setMessage("Opslaan…");
    const next = [form, ...recent].slice(0, 20);
    localStorage.setItem("sem-session-feedback", JSON.stringify(next));

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Feedback opgeslagen — dit helpt je weekreview slimmer worden.");
    } catch {
      setMessage("Lokaal opgeslagen.");
    }

    setRecent(next);
  }

  function slider(label: string, key: "rpe" | "breathlessness" | "legs" | "quality", left: string, right: string) {
    return (
      <label className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex justify-between text-xs"><span className="text-zinc-500">{label}</span><span>{form[key]}/10</span></div>
        <input type="range" min="0" max="10" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))} className="mt-3 w-full" />
        <div className="mt-1 flex justify-between text-[9px] text-zinc-600"><span>{left}</span><span>{right}</span></div>
      </label>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-900/60 bg-violet-950/10 p-5">
        <p className="text-xs text-violet-300">POST-SESSION CHECK-IN</p>
        <h2 className="mt-1 text-xl font-semibold">Hoe voelde de training echt?</h2>
        <p className="mt-1 text-xs text-zinc-500">Garmin ziet cijfers. Jij vertelt de coach hoe zwaar en goed het voelde.</p>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm" />
          <input value={form.sessionName} onChange={(e) => setForm((f) => ({ ...f, sessionName: e.target.value }))} placeholder="Bijv. voetbaltraining" className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none" />
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {slider("RPE", "rpe", "easy", "max")}
          {slider("Benauwd / buiten adem", "breathlessness", "easy", "zwaar")}
          {slider("Benen", "legs", "fris", "leeg")}
          {slider("Kwaliteit", "quality", "slecht", "top")}
        </div>

        <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2} placeholder="Bijv. eerste 20 min goed, daarna conditie zakte weg…" className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none" />

        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Feedback opslaan</button>
          {message && <span className="text-xs text-zinc-500">{message}</span>}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">RECENT FEEDBACK</p>
          <div className="mt-3 space-y-2">
            {recent.slice(0, 5).map((entry, index) => (
              <div key={entry.date + index} className="rounded-xl bg-zinc-950 p-3">
                <div className="flex justify-between gap-3">
                  <div><p className="text-sm font-medium">{entry.sessionName}</p><p className="text-[10px] text-zinc-600">{entry.date}</p></div>
                  <p className="text-xs text-zinc-400">RPE {entry.rpe} · Quality {entry.quality}</p>
                </div>
                {entry.note && <p className="mt-2 text-xs text-zinc-500">{entry.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
