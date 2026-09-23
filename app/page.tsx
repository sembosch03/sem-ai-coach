import AuthBar from "@/components/AuthBar";
import TopNav from "@/components/TopNav";
import SmartTips from "@/components/SmartTips";
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
  return value === null ? "—" : String(Math.round(value)) + suffix;
}

async function getData() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return { activities: [] as DataRow[], wellness: [] as DataRow[], error: "Intervals API ontbreekt" };

  const auth = Buffer.from("API_KEY:" + key).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const query = "oldest=" + iso(oldest) + "&newest=" + iso(newest);

  try {
    const [a, w] = await Promise.all([
      fetch("https://intervals.icu/api/v1/athlete/0/activities?" + query, {
        headers: { Authorization: "Basic " + auth },
        cache: "no-store",
      }),
      fetch("https://intervals.icu/api/v1/athlete/0/wellness?" + query, {
        headers: { Authorization: "Basic " + auth },
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
        ? String(Math.floor(sleepSecs / 3600)) + "u" + String(Math.round((sleepSecs % 3600) / 60))
        : "—";

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

  const primaryMetrics = [
    ["Sleep", sleep],
    ["HRV", format(hrv, " ms")],
    ["Rest HR", format(restingHr, " bpm")],
    ["Readiness", format(readiness)],
  ];

  const secondaryMetrics = [
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
          ? "Hersteldata komt binnen. Kijk vooral naar de trend, niet naar één losse meting."
          : "Nog niet alle hersteldata is binnen. Gebruik gevoel, RPE en je check-in.";

  const recent = data.activities.slice(0, 4);
  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(new Date());

  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-eyebrow">{dateLabel}</p>
            <h1 className="app-title">Goed bezig, Sem.</h1>
            <p className="app-subtitle">Alles wat vandaag telt: herstel, je plan en de volgende beste actie.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[.06] bg-white/[.025] px-3 py-2 text-xs text-zinc-400">
              <span className={data.error ? "h-1.5 w-1.5 rounded-full bg-amber-400" : "h-1.5 w-1.5 rounded-full bg-emerald-400"} />
              {data.error ? "Sync issue" : "Data live"}
            </span>
            {supabase && <AuthBar email={authEmail} />}
          </div>
        </header>

        <section className="app-card overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-5 sm:p-6">
              <p className="app-eyebrow">Vandaag</p>
              <h2 className="mt-2 max-w-2xl text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">{quickTip}</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {primaryMetrics.map(([label, value]) => (
                  <div key={label} className="metric-card">
                    <p className="metric-label">{label}</p>
                    <p className="metric-value">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[.06] bg-white/[.018] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between">
                <p className="app-eyebrow">Training status</p>
                <span className="text-xs text-zinc-600">{recentWeek.length} sessies deze week</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                {secondaryMetrics.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-200">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SmartTips />

        <div className="mt-5">
          <PerformanceOS />
        </div>

        <section className="app-card mt-5 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="app-eyebrow">Recent</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight">Laatste trainingen</h2>
            </div>
            <a href="/history" className="rounded-full bg-white/[.045] px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Bekijk alles</a>
          </div>

          <div className="mt-3 divide-y divide-white/[.055]">
            {recent.map((activity, index) => {
              const name = textFrom(activity, ["name", "type", "sport"]) ?? "Activity";
              const load = numberFrom(activity, ["icu_training_load", "training_load", "load"]);
              return (
                <div key={String(activity.id ?? index)} className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{dateValue(activity).slice(0, 10)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[.04] px-2.5 py-1 text-[10px] text-zinc-500">
                    {load === null ? "load —" : "load " + String(Math.round(load))}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
