import { assessCoach } from "@/lib/coach";

type DataRow = Record<string, unknown>;

type CoachData = {
  fetchedAt?: string;
  activities?: DataRow[];
  wellness?: DataRow[];
  wellnessWarning?: string | null;
  error?: string;
};

function numberFrom(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
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

function formatNumber(value: number | null, suffix = "", digits = 0) {
  return value === null ? "--" : `${value.toFixed(digits)}${suffix}`;
}

function dateValue(row: DataRow) {
  return (
    textFrom(row, ["date", "start_date_local", "start_date", "icu_date"]) ?? ""
  );
}

async function getCoachData(): Promise<CoachData> {
  try {
    const apiKey = process.env.INTERVALS_API_KEY;
    if (!apiKey) return { error: "INTERVALS_API_KEY ontbreekt" };

    const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
    const newest = new Date();
    const oldest = new Date();
    oldest.setDate(newest.getDate() - 42);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

    const [activitiesResponse, wellnessResponse] = await Promise.all([
      fetch(`https://intervals.icu/api/v1/athlete/0/activities?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`https://intervals.icu/api/v1/athlete/0/wellness?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
    ]);

    if (!activitiesResponse.ok) {
      return { error: `Intervals activities: HTTP ${activitiesResponse.status}` };
    }

    const activities = (await activitiesResponse.json()) as DataRow[];
    let wellness: DataRow[] = [];
    let wellnessWarning: string | null = null;

    if (wellnessResponse.ok) {
      wellness = (await wellnessResponse.json()) as DataRow[];
    } else {
      wellnessWarning = `Wellness: HTTP ${wellnessResponse.status}`;
    }

    return { activities, wellness, wellnessWarning, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Onbekende fout" };
  }
}

export default async function Home() {
  const data = await getCoachData();
  const activities = [...(data.activities ?? [])].sort((a, b) =>
    dateValue(b).localeCompare(dateValue(a))
  );
  const wellness = [...(data.wellness ?? [])].sort((a, b) =>
    dateValue(b).localeCompare(dateValue(a))
  );
  const latest = wellness[0];

  const fitness = numberFrom(latest, ["ctl", "icu_ctl", "fitness"]);
  const fatigue = numberFrom(latest, ["atl", "icu_atl", "fatigue"]);
  const formRaw = numberFrom(latest, ["tsb", "icu_tsb", "form"]);
  const form =
    formRaw ?? (fitness !== null && fatigue !== null ? fitness - fatigue : null);
  const hrv = numberFrom(latest, ["hrv", "hrv_rmssd", "rmssd"]);
  const restingHr = numberFrom(latest, ["restingHR", "resting_hr", "restingHr"]);
  const sleepScore = numberFrom(latest, ["sleepScore", "sleep_score"]);
  const readiness = numberFrom(latest, ["readiness", "readiness_score"]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyActivities = activities.filter((activity) => {
    const date = new Date(dateValue(activity));
    return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo;
  });
  const weeklyLoadValues = weeklyActivities
    .map((activity) =>
      numberFrom(activity, ["icu_training_load", "training_load", "load"])
    )
    .filter((value): value is number => value !== null);
  const weeklyLoad =
    weeklyLoadValues.length > 0
      ? weeklyLoadValues.reduce((sum, value) => sum + value, 0)
      : null;

  const cards = [
    { title: "Readiness", value: formatNumber(readiness), sub: "Garmin / Intervals wellness" },
    { title: "Fitness", value: formatNumber(fitness), sub: "CTL · Intervals.icu" },
    { title: "Fatigue", value: formatNumber(fatigue), sub: "ATL · Intervals.icu" },
    { title: "Form", value: formatNumber(form), sub: "TSB · fitness minus fatigue" },
    { title: "HRV", value: formatNumber(hrv, " ms"), sub: "Laatste wellnessmeting" },
    { title: "Sleep", value: formatNumber(sleepScore), sub: "Garmin sleep score" },
    { title: "Resting HR", value: formatNumber(restingHr, " bpm"), sub: "Rusthartslag" },
    { title: "Weekly Load", value: formatNumber(weeklyLoad), sub: `${weeklyActivities.length} activiteiten · 7 dagen` },
  ];

  const coach = assessCoach(latest, weeklyLoad);
  const recent = activities.slice(0, 5);
  const garminCount = activities.filter(
    (a) => textFrom(a, ["source"])?.toUpperCase() === "GARMIN"
  ).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-emerald-400">SEM PERFORMANCE · V0.3</p>
            <h1 className="text-4xl font-bold">AI Football Coach</h1>
            <p className="mt-2 text-zinc-400">Football · Conditioning · Strength · Recovery</p>
          </div>
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
            Intervals.icu ● {data.error ? "Error" : "Live"}
          </div>
        </header>

        {data.error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {data.error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm text-zinc-400">{card.title}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
              <p className="mt-2 text-xs text-zinc-500">{card.sub}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm text-emerald-400">AI COACH · {coach.status}</p>
              <h2 className="mt-2 text-2xl font-semibold">{coach.title}</h2>
              <p className="mt-3 leading-7 text-zinc-300">{coach.summary}</p>
            </div>
            <div className="rounded-xl border border-emerald-900/70 bg-zinc-950/40 px-4 py-3 text-sm">
              Confidence: <span className="font-semibold">{coach.confidence}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {coach.reasons.slice(0, 6).map((reason) => (
              <div key={reason} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-400">
                {reason}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">
            Coachadvies gebruikt alleen beschikbare trainings- en hersteldata. HRV en rusthartslag worden pas als trend gebruikt zodra meerdere metingen beschikbaar zijn; medische beslissingen worden niet geautomatiseerd.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
            <p className="text-sm text-zinc-400">RECENT ACTIVITY</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {recent.length ? `${activities.length} activities synced` : "Waiting for activity data"}
            </h2>
            <div className="mt-5 space-y-3">
              {recent.length ? recent.map((activity, index) => {
                const name = textFrom(activity, ["name", "type", "sport"]) ?? "Activity";
                const source = textFrom(activity, ["source"]) ?? "Intervals";
                const load = numberFrom(activity, ["icu_training_load", "training_load", "load"]);
                return (
                  <div key={String(activity.id ?? `${dateValue(activity)}-${index}`)} className="flex items-center justify-between rounded-xl bg-zinc-950 p-4">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{dateValue(activity).slice(0, 10)} · {source}</p>
                    </div>
                    <span className="text-sm text-zinc-400">{load === null ? "load --" : `load ${Math.round(load)}`}</span>
                  </div>
                );
              }) : <p className="text-sm text-zinc-500">Nog geen activiteiten gevonden.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-6">
            <p className="text-sm text-emerald-400">DATA STATUS</p>
            <h2 className="mt-2 text-xl font-semibold">Garmin Import</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {garminCount > 0
                ? `${garminCount} Garmin activities gevonden. Directe Garmin-data komt nu binnen.`
                : "Nog geen direct-Garmin activities in deze API-periode. Strava-activiteiten kunnen beperkte velden hebben."}
            </p>
            <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-xs text-zinc-400">
              Wellness rows: {wellness.length}
              {data.wellnessWarning ? ` · ${data.wellnessWarning}` : ""}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-400">LIVE SYNC</p>
              <h2 className="mt-1 text-xl font-semibold">Intervals.icu → Sem Performance</h2>
            </div>
            <span className="text-sm text-zinc-500">
              Geen fake metrics · ontbrekende data blijft --
            </span>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-400">
            Het dashboard leest nu echte activities en wellnessdata server-side. Zodra Garmin health history in Intervals.icu staat, verschijnen beschikbare herstelmetrics automatisch.
          </p>
        </section>
      </div>
    </main>
  );
}
