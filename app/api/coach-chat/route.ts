import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

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

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(request: Request) {
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return NextResponse.json({ error: "Geen vraag ontvangen" }, { status: 400 });

  const openAiKey = process.env.OPENAI_API_KEY;
  const intervalsKey = process.env.INTERVALS_API_KEY;
  if (!openAiKey || !intervalsKey) return NextResponse.json({ error: "API-configuratie ontbreekt" }, { status: 500 });

  try {
    const auth = Buffer.from(`API_KEY:${intervalsKey}`).toString("base64");
    const newest = new Date();
    const oldest = new Date();
    oldest.setDate(newest.getDate() - 14);
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

    let checkIn: Record<string, unknown> | null = null;
    let profile: Record<string, unknown> | null = null;
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = iso(new Date());
        const [{ data: check }, { data: athlete }] = await Promise.all([
          supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", today).maybeSingle(),
          supabase.from("athlete_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        checkIn = check;
        profile = athlete;
      }
    }

    const context = {
      profile: profile ?? {
        age: 22,
        goal: "Voetbalconditie verbeteren en kracht/spiermassa behouden",
        gymDaysTarget: 5,
        conditioningPriority: 5,
      },
      checkIn,
      latestWellness: wellness.slice(0, 5).map((row) => ({
        date: dateValue(row),
        sleepScore: numberFrom(row, ["sleepScore", "sleep_score"]),
        sleepSecs: numberFrom(row, ["sleepSecs", "sleep_secs"]),
        hrv: numberFrom(row, ["hrv", "hrv_rmssd", "rmssd"]),
        restingHr: numberFrom(row, ["restingHR", "resting_hr", "restingHr"]),
        fitness: numberFrom(row, ["ctl", "icu_ctl", "fitness"]),
        fatigue: numberFrom(row, ["atl", "icu_atl", "fatigue"]),
      })),
      recentActivities: activities.slice(0, 8).map((a) => ({
        date: dateValue(a),
        name: textFrom(a, ["name", "type", "sport"]) ?? "Activity",
        load: numberFrom(a, ["icu_training_load", "training_load", "load"]),
        durationSecs: numberFrom(a, ["moving_time", "elapsed_time"]),
        distanceMeters: numberFrom(a, ["distance"]),
        avgHr: numberFrom(a, ["average_heartrate"]),
        maxHr: numberFrom(a, ["max_heartrate"]),
      })),
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
              text: "Je bent de persoonlijke voetbal performance coach in Sem Performance. Antwoord in compact Nederlands, praktisch en motiverend. Hoofddoel: betere voetbalconditie, kracht/spiermassa behouden, herstel respecteren. Gebruik alleen de gegeven data; verzin geen cijfers. Bij shin-pijn of andere pijn mag je training aanpassen maar geen diagnose stellen. Geen medicatieadvies. Als de vraag gaat over gym + voetbal op dezelfde dag, geef duidelijke volgorde en reden. Conditioning moet concreet zijn met duur, werk/rust en intensiteit. Maximaal ongeveer 180 woorden tenzij de gebruiker om meer vraagt."
            }]
          },
          {
            role: "user",
            content: [{
              type: "input_text",
              text: JSON.stringify({ question: message, context })
            }]
          }
        ]
      })
    });

    if (!response.ok) return NextResponse.json({ error: `OpenAI HTTP ${response.status}` }, { status: 502 });

    const raw = (await response.json()) as Record<string, unknown>;
    const answer = outputText(raw);
    if (!answer) return NextResponse.json({ error: "Geen antwoord ontvangen" }, { status: 502 });

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
  }
}
