import { NextResponse } from "next/server";
import { assessCoach, dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";
import { buildDayPlan } from "@/lib/day-plan";

const iso = (date: Date) => date.toISOString().slice(0, 10);

function latestNumber(rows: DataRow[], keys: string[]) {
  for (const row of rows) {
    const value = numberFrom(row, keys);
    if (value !== null) return value;
  }
  return null;
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
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
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

    if (!activitiesResponse.ok || !wellnessResponse.ok) {
      return NextResponse.json(
        {
          error: "Intervals.icu data kon niet volledig worden opgehaald",
          activitiesStatus: activitiesResponse.status,
          wellnessStatus: wellnessResponse.status,
        },
        { status: 502 }
      );
    }

    const activities = ((await activitiesResponse.json()) as DataRow[]).sort((a, b) =>
      dateValue(b).localeCompare(dateValue(a))
    );
    const wellness = ((await wellnessResponse.json()) as DataRow[]).sort((a, b) =>
      dateValue(b).localeCompare(dateValue(a))
    );

    const latest = wellness[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyActivities = activities.filter((activity) => {
      const date = new Date(dateValue(activity));
      return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo;
    });

    const loads = weeklyActivities
      .map((activity) => numberFrom(activity, ["icu_training_load", "training_load", "load"]))
      .filter((value): value is number => value !== null);
    const weeklyLoad = loads.length ? loads.reduce((sum, value) => sum + value, 0) : null;

    const coach = assessCoach(latest, weeklyLoad);
    const fallback = buildDayPlan(coach);

    const context = {
      athlete: {
        age: 22,
        heightCm: 180,
        weightKg: 80,
        goal: "Voetbalconditie sterk verbeteren terwijl spiermassa en kracht behouden blijven.",
        gymFrequency: "4-6x per week",
        football: "Teamtraining meestal dinsdag en/of donderdag, wedstrijd zondag.",
        note: "Astma aanwezig. Geen medicatie- of medische beslissingen automatiseren.",
      },
      recovery: {
        sleepScore: latestNumber(wellness, ["sleepScore", "sleep_score"]),
        sleepSecs: latestNumber(wellness, ["sleepSecs", "sleep_secs"]),
        hrv: latestNumber(wellness, ["hrv", "hrv_rmssd", "rmssd"]),
        restingHR: latestNumber(wellness, ["restingHR", "resting_hr", "restingHr"]),
        readiness: latestNumber(wellness, ["readiness", "readiness_score"]),
        fitness: latestNumber(wellness, ["ctl", "icu_ctl", "fitness"]),
        fatigue: latestNumber(wellness, ["atl", "icu_atl", "fatigue"]),
        weeklyLoad,
      },
      recentActivities: activities.slice(0, 8).map((activity) => ({
        date: dateValue(activity),
        name: textFrom(activity, ["name", "type", "sport"]) ?? "Activity",
        source: textFrom(activity, ["source"]) ?? null,
        load: numberFrom(activity, ["icu_training_load", "training_load", "load"]),
        avgHR: numberFrom(activity, ["average_heartrate"]),
        maxHR: numberFrom(activity, ["max_heartrate"]),
        durationSecs: numberFrom(activity, ["moving_time", "elapsed_time"]),
        distanceMeters: numberFrom(activity, ["distance"]),
      })),
      deterministicGuardrail: { coach, fallback },
      localDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Amsterdam",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    };

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({
        mode: "fallback",
        message: "OPENAI_API_KEY ontbreekt; veilige coach-engine wordt gebruikt.",
        plan: {
          status: coach.status,
          primary: fallback.primary,
          gym: fallback.gym,
          conditioning: fallback.conditioning,
          rpe: fallback.target,
          reasoning: coach.reasons.join(" · ") || fallback.note,
          tomorrow: "Wordt aangepast zodra de AI API actief is.",
          confidence: coach.confidence,
        },
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        store: false,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "Je bent een persoonlijke voetbal-conditioning en krachtcoach. Maak de training van vandaag op basis van de aangeleverde echte data. Prioriteit: voetbalconditie verbeteren, spiermassa en kracht behouden, herstel bewaken. Respecteer de deterministische guardrails bij slechte hersteldata. Verzin nooit ontbrekende metingen. Geef geen medicatieadvies en automatiseer geen medische beslissingen. Houd rekening met teamtraining dinsdag/donderdag en wedstrijd zondag. Antwoord uitsluitend volgens het JSON-schema.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(context) }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "daily_training_plan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                status: { type: "string", enum: ["REST", "EASY", "NORMAL", "HARD"] },
                primary: { type: "string" },
                gym: { type: "string" },
                conditioning: { type: "string" },
                rpe: { type: "string" },
                reasoning: { type: "string" },
                tomorrow: { type: "string" },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: [
                "status",
                "primary",
                "gym",
                "conditioning",
                "rpe",
                "reasoning",
                "tomorrow",
                "confidence",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        mode: "fallback",
        message: `AI API fout (HTTP ${response.status}); veilige coach-engine wordt gebruikt.`,
        plan: {
          status: coach.status,
          primary: fallback.primary,
          gym: fallback.gym,
          conditioning: fallback.conditioning,
          rpe: fallback.target,
          reasoning: coach.reasons.join(" · ") || fallback.note,
          tomorrow: "AI tijdelijk niet beschikbaar.",
          confidence: coach.confidence,
        },
      });
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const text = outputText(raw);
    if (!text) {
      return NextResponse.json({ error: "AI antwoord bevatte geen plan" }, { status: 502 });
    }

    return NextResponse.json({ mode: "ai", plan: JSON.parse(text) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
