import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

type DayChoice = {
  mode?: "auto" | "gym" | "football" | "gym_football" | "match" | "rest" | "unavailable";
  note?: string;
};

type DailyCheckIn = {
  energy?: number;
  legSoreness?: number;
  shinPain?: number;
  motivation?: number;
  availableMinutes?: number;
  note?: string;
};

type RequestBody = {
  days?: Record<string, DayChoice>;
  gymDaysTarget?: number;
  legDayTarget?: number;
  conditioningPriority?: number;
  checkIn?: DailyCheckIn;
  force?: boolean;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

function mondayKey(date = new Date()) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return iso(local);
}

function outputText(data: Record<string, unknown>) {
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) return (part as { text: string }).text;
    }
  }
  return null;
}

async function loadIntervals() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) throw new Error("INTERVALS_API_KEY ontbreekt");

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);
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

  const activities = activitiesResponse.ok ? ((await activitiesResponse.json()) as DataRow[]) : [];
  const wellness = wellnessResponse.ok ? ((await wellnessResponse.json()) as DataRow[]) : [];
  activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));
  wellness.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));
  return { activities, wellness };
}

async function readCloudPlan() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("weekly_plans")
    .select("plan, generated_at")
    .eq("user_id", user.id)
    .eq("week_start", mondayKey())
    .maybeSingle();

  return data ? { plan: data.plan, generatedAt: data.generated_at } : null;
}

async function saveCloudPlan(plan: unknown) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("weekly_plans").upsert({
    user_id: user.id,
    week_start: mondayKey(),
    plan,
    generated_at: new Date().toISOString(),
  });
}

export async function GET() {
  const cached = await readCloudPlan();
  return NextResponse.json({ cached: cached ?? null, weekStart: mondayKey() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;

  if (!body.force) {
    const cached = await readCloudPlan();
    if (cached) {
      return NextResponse.json({ mode: "cached", ...cached, weekStart: mondayKey() });
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY ontbreekt" }, { status: 500 });
  }

  try {
    const { activities, wellness } = await loadIntervals();

    const context = {
      athlete: {
        age: 22,
        goal: "Voetbalconditie maximaal verbeteren terwijl kracht en spiermassa behouden blijven.",
        gymExperience: "4 jaar krachttraining, gym meestal 4-6x per week.",
        footballRhythm: "Teamtraining meestal dinsdag/donderdag en wedstrijd meestal zondag.",
      },
      targets: {
        gymDays: body.gymDaysTarget ?? 5,
        legDays: body.legDayTarget ?? 1,
        conditioningPriority: body.conditioningPriority ?? 5,
        conditioningGoal: "Specifiek betere voetbalconditie: aerobe basis, herstel tussen acties en repeated-sprint capacity opbouwen zonder krachtverlies.",
      },
      dailyCheckIn: body.checkIn ?? null,
      userChoices: body.days ?? {},
      wellness: wellness.slice(0, 10).map((row) => ({
        date: dateValue(row),
        sleepScore: numberFrom(row, ["sleepScore", "sleep_score"]),
        sleepSecs: numberFrom(row, ["sleepSecs", "sleep_secs"]),
        hrv: numberFrom(row, ["hrv", "hrv_rmssd", "rmssd"]),
        restingHR: numberFrom(row, ["restingHR", "resting_hr", "restingHr"]),
        fitness: numberFrom(row, ["ctl", "icu_ctl", "fitness"]),
        fatigue: numberFrom(row, ["atl", "icu_atl", "fatigue"]),
        readiness: numberFrom(row, ["readiness", "readiness_score"]),
      })),
      recentActivities: activities.slice(0, 14).map((activity) => ({
        date: dateValue(activity),
        name: textFrom(activity, ["name", "type", "sport"]) ?? "Activity",
        source: textFrom(activity, ["source"]) ?? null,
        load: numberFrom(activity, ["icu_training_load", "training_load", "load"]),
        avgHR: numberFrom(activity, ["average_heartrate"]),
        maxHR: numberFrom(activity, ["max_heartrate"]),
        durationSecs: numberFrom(activity, ["moving_time", "elapsed_time"]),
        distanceMeters: numberFrom(activity, ["distance"]),
      })),
      rules: [
        "Respecteer unavailable/rest/match keuzes altijd.",
        "Als gym en voetbal op dezelfde dag staan: bepaal expliciet welke eerst en waarom.",
        "Geen onnodige zware benen vlak voor wedstrijd of zware voetbaltraining.",
        "Krachttraining hoeft geen oefenlijst te bevatten; gebruik alleen focus zoals Push, Pull, Upper, Legs of Rest.",
        "Conditioning moet WEL concreet zijn: duur, intervallen, rust en intensiteit/zone.",
        "Plan minimaal één gerichte conditioningsprikkel buiten voetbal wanneer herstel en wedstrijdplanning dit toelaten; bij hoge conditioningPriority liefst twee, maar nooit ten koste van wedstrijdfrisheid.",
        "Wissel slim tussen zone 2, voetbal-specifieke intervals/repeated efforts en herstel.",
        "Als shinPain 4-6 is: vervang extra hardloopconditioning door low-impact bike/elliptical/rower en beperk impact. Als shinPain 7-10 is: geen extra running/jumping/sprints en adviseer beoordeling als pijn toeneemt, looppatroon verandert of pijn in rust aanwezig is.",
        "Gebruik dagelijkse energie, beenspierpijn, motivatie en beschikbare tijd om volume/intensiteit te schalen.",
        "Hou teksten kort en scanbaar.",
        "Verzin geen ontbrekende slaap/HRV data.",
      ],
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        store: false,
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "Je bent een elite maar praktische voetbal performance coach. Hoofddoel is aantoonbaar betere voetbalconditie terwijl kracht en spiermassa behouden blijven. Maak één stabiele weekplanning die alleen opnieuw wordt gegenereerd als de gebruiker dat vraagt. Combineer voetbal, gym en gerichte conditioning; conditioning mag niet verdwijnen alleen omdat er gym en voetbal is. Gebruik concrete conditioningsprotocollen, geef bij gym+voetbal duidelijke volgorde, respecteer pijn/check-in signalen en houd output compact. Antwoord uitsluitend volgens het JSON-schema."
            }]
          },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify(context) }] }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "performance_week",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: { type: "string" },
                weeklyFocus: { type: "string" },
                coachTip: { type: "string" },
                days: {
                  type: "array",
                  minItems: 7,
                  maxItems: 7,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      day: { type: "string" },
                      primary: { type: "string" },
                      gymFocus: { type: "string" },
                      conditioning: { type: "string" },
                      orderAdvice: { type: "string" },
                      intensity: { type: "string" },
                      tip: { type: "string" },
                    },
                    required: ["day","primary","gymFocus","conditioning","orderAdvice","intensity","tip"]
                  }
                }
              },
              required: ["headline","weeklyFocus","coachTip","days"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: `OpenAI HTTP ${response.status}` }, { status: 502 });
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const text = outputText(raw);
    if (!text) return NextResponse.json({ error: "Geen AI-plan ontvangen" }, { status: 502 });

    const plan = JSON.parse(text);
    await saveCloudPlan(plan);

    return NextResponse.json({
      mode: "ai",
      plan,
      generatedAt: new Date().toISOString(),
      weekStart: mondayKey(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
