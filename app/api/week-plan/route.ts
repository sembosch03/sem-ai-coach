import { NextResponse } from "next/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

const iso = (date: Date) => date.toISOString().slice(0, 10);

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
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function fallbackWeek() {
  return [
    { day: "Monday", focus: "Gym", session: "Upper body + rustige zone 2 optioneel", intensity: "RPE 6-7", note: "Geen zware benen vlak voor voetbal." },
    { day: "Tuesday", focus: "Football", session: "Teamtraining", intensity: "RPE 6-8", note: "Geen extra harde intervals." },
    { day: "Wednesday", focus: "Gym", session: "Upper body / lichte benen afhankelijk van herstel", intensity: "RPE 6-7", note: "Herstel van dinsdag bewaken." },
    { day: "Thursday", focus: "Football", session: "Teamtraining", intensity: "RPE 6-8", note: "Voetbal is de hoofdconditieprikkel." },
    { day: "Friday", focus: "Gym", session: "Upper body, benen alleen licht", intensity: "RPE 6", note: "Zondag wedstrijd in beeld houden." },
    { day: "Saturday", focus: "Recovery", session: "Rust / mobiliteit / korte wandeling", intensity: "RPE 2-3", note: "Fris worden voor de wedstrijd." },
    { day: "Sunday", focus: "Match", session: "Voetbalwedstrijd", intensity: "Match", note: "Geen extra conditioning." }
  ];
}

export async function GET() {
  const intervalsKey = process.env.INTERVALS_API_KEY;
  if (!intervalsKey) {
    return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });
  }

  const auth = Buffer.from(`API_KEY:${intervalsKey}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
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

    const activities = activitiesResponse.ok
      ? ((await activitiesResponse.json()) as DataRow[])
      : [];
    const wellness = wellnessResponse.ok
      ? ((await wellnessResponse.json()) as DataRow[])
      : [];

    activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));
    wellness.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    const context = {
      goal: "Voetbalconditie sterk verbeteren terwijl kracht en spiermassa behouden blijven.",
      weeklyRhythm: "Voetbaltraining meestal dinsdag en donderdag, wedstrijd zondag. Gym 4-6x per week.",
      wellness: wellness.slice(0, 7).map((row) => ({
        date: dateValue(row),
        sleepScore: numberFrom(row, ["sleepScore", "sleep_score"]),
        sleepSecs: numberFrom(row, ["sleepSecs", "sleep_secs"]),
        hrv: numberFrom(row, ["hrv", "hrv_rmssd", "rmssd"]),
        restingHR: numberFrom(row, ["restingHR", "resting_hr", "restingHr"]),
        fitness: numberFrom(row, ["ctl", "icu_ctl", "fitness"]),
        fatigue: numberFrom(row, ["atl", "icu_atl", "fatigue"]),
        readiness: numberFrom(row, ["readiness", "readiness_score"]),
      })),
      recentActivities: activities.slice(0, 10).map((activity) => ({
        date: dateValue(activity),
        name: textFrom(activity, ["name", "type", "sport"]) ?? "Activity",
        load: numberFrom(activity, ["icu_training_load", "training_load", "load"]),
        avgHR: numberFrom(activity, ["average_heartrate"]),
        maxHR: numberFrom(activity, ["max_heartrate"]),
        durationSecs: numberFrom(activity, ["moving_time", "elapsed_time"]),
        distanceMeters: numberFrom(activity, ["distance"]),
      })),
    };

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({
        mode: "fallback",
        week: fallbackWeek(),
        summary: "OpenAI API is nog niet actief in deze deployment; basisweek wordt gebruikt.",
      });
    }

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
              text: "Maak een praktisch 7-daags voetbal-, conditie- en krachtschema op basis van de aangeleverde data. Gebruik alleen aanwezige metingen, verzin geen hersteldata, vermijd onnodige dubbele zware prikkels en antwoord uitsluitend volgens het JSON-schema."
            }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(context) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "weekly_training_plan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                week: {
                  type: "array",
                  minItems: 7,
                  maxItems: 7,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      day: { type: "string" },
                      focus: { type: "string" },
                      session: { type: "string" },
                      intensity: { type: "string" },
                      note: { type: "string" }
                    },
                    required: ["day", "focus", "session", "intensity", "note"]
                  }
                }
              },
              required: ["summary", "week"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json({
        mode: "fallback",
        week: fallbackWeek(),
        summary: `AI API fout (HTTP ${response.status}); basisweek wordt gebruikt.`,
      });
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const text = outputText(raw);
    if (!text) {
      return NextResponse.json({
        mode: "fallback",
        week: fallbackWeek(),
        summary: "AI gaf geen bruikbaar antwoord; basisweek wordt gebruikt.",
      });
    }

    return NextResponse.json({ mode: "ai", ...JSON.parse(text) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
