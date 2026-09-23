import AuthBar from "@/components/AuthBar";
import PerformanceOS from "@/components/PerformanceOS";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type DataRow = Record<string, unknown>;

function numberFrom(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function textFrom(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function dateValue(row: DataRow) {
  return textFrom(row, ["date", "start_date_local", "start_date", "icu_date"]) ?? "";
}

function format(value: number | null, suffix = "") {
  return value === null ? "--" : `${Math.round(value)}${suffix}`;
}

async function getData() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return { activities: [] as DataRow[], wellness: [] as DataRow[], error: "Intervals API ontbreekt" };

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const [a, w] = await Promise.all([
      fetch(`https://intervals.icu/api/v1/athlete/0/activities?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`https://intervals.icu/api/v1/athlete/0/wellness?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
    ]);

    const activities = a.ok ? ((await a.json()) as DataRow[]) : [];
    const wellness = w.ok ? ((await w.json()) as DataRow[]) : [];
    activities.sort((x, y) => dateValue(y).localeCompare(dateValue(x)));
    wellness.sort((x, y) => dateValue(y).localeCompare(dateValue(x)));
    return { activities, wellness, error: null as string | null };
  } catch {
    return { activities: [] as DataRow[], wellness: [] as DataRow[], error: "Data sync fout" };
  }
}

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  let authEmail: string | null = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    authEmail = user.email ?? null;
  }

  const data = await getData();
  const latestNumber = (keys: string[]) => {
    for (const row of data.wellness) {
      const value = numberFrom(row, keys);
      if (value !== null) return value;
    }
    return null;
  };

  const sleepScore = latestNumber(["sleepScore", "sleep_score"]);
  const sleepSecs = latestNumber(["sleepSecs", "sleep_secs"]);
  const hrv = latestNumber(["hrv", "hrv_rmssd", "rmssd"]);
  const restingHr = latestNumber(["restingHR", "resting_hr", "restingHr"]);
  const fitness = latestNumber(["ctl", "icu_ctl", "fitness"]);
  const fatigue = latestNumber(["atl", "icu_atl", "fatigue"]);
  const readiness = latestNumber(["readiness", "readiness_score"]);

  const formRaw = latestNumber(["tsb", "icu_tsb", "form"]);
  const form = formRaw ?? (fitness !== null && fatigue !== null ? fitness - fatigue : null);

  const sleep =
    sleepScore !== null
      ? String(Math.round(sleepScore))
      : sleepSecs !== null
        ? `${Math.floor(sleepSecs / 3600)}u${Math.round((sleepSecs % 3600) / 60)}`
        : "--";

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentWeek = data.activities.filter((activity) => {
    const date = new Date(dateValue(activity));
    return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo;
  });

  const loads = recentWeek
    .map((activity) => numberFrom(activity, ["icu_training_load", "training_load", "load"]))
    .filter((value): value is number => value !== null);
  const weeklyLoad = loads.length ? loads.reduce((a, b) => a + b, 0) : null;

  const metrics = [
    ["Sleep", sleep],
    ["HRV", format(hrv, " ms")],
    ["Rest HR", format(restingHr, " bpm")],
    ["Readiness", format(readiness)],
    ["Fitness", format(fitness)],
    ["Fatigue", format(fatigue)],
    ["Form", format(form)],
    ["7d Load", format(weeklyLoad)],
  ];

  const quickTip =
    sleepScore !== null && sleepScore >= 80
      ? "Sterke slaap. Goede basis voor een normale trainingsdag."
      : sleepScore !== null && sleepScore < 60
        ? "Slaap was matig. Hou extra intensiteit vandaag onder controle."
        : hrv !== null
          ? "Hersteldata komt binnen. Laat de trend zwaarder wegen dan één losse meting."
          : "Nog niet alle hersteldata is binnen. Plan conservatief en gebruik RPE.";

  const recent = data.activities.slice(0, 4);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400">SEM PERFORMANCE · V1.0</p>
            <h1 className="text-3xl font-bold">Performance Coach</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
              Intervals {data.error ? "● Error" : "● Live"}
            </span>
            {supabase && <AuthBar email={authEmail} />}
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3">
          <p className="text-xs text-emerald-400">TODAY TIP</p>
          <p className="mt-1 text-sm text-zinc-300">{quickTip}</p>
        </section>

        <PerformanceOS />

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">RECENT</p>
              <h2 className="mt-1 text-lg font-semibold">Laatste trainingen</h2>
            </div>
            <span className="text-xs text-zinc-600">{recentWeek.length} deze week</span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {recent.map((activity, index) => {
              const name = textFrom(activity, ["name", "type", "sport"]) ?? "Activity";
              const load = numberFrom(activity, ["icu_training_load", "training_load", "load"]);
              return (
                <div key={String(activity.id ?? index)} className="rounded-xl bg-zinc-950 p-3">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {dateValue(activity).slice(0, 10)} · {load === null ? "load --" : `load ${Math.round(load)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
