import { NextResponse } from "next/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
      ) return (part as { text: string }).text;
    }
  }
  return null;
}

export async function POST() {
  const intervalsKey = process.env.INTERVALS_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!intervalsKey || !openAiKey) {
    return NextResponse.json({ error: "API-configuratie ontbreekt" }, { status: 500 });
  }

  const auth = Buffer.from(`API_KEY:${intervalsKey}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 15);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/0/activities?${query}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );

    const activities = response.ok ? ((await response.json()) as DataRow[]) : [];
    activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    const now = new Date();
    const sevenAgo = new Date(now);
    sevenAgo.setDate(now.getDate() - 7);
    const fourteenAgo = new Date(now);
    fourteenAgo.setDate(now.getDate() - 14);

    function mapActivity(activity: DataRow) {
      return {
        date: dateValue(activity),
        name: textFrom(activity, ["name", "type", "sport"]) ?? "Activity",
        load: numberFrom(activity, ["icu_training_load", "training_load", "load"]),
        avgHR: numberFrom(activity, ["average_heartrate"]),
        maxHR: numberFrom(activity, ["max_heartrate"]),
        durationSecs: numberFrom(activity, ["moving_time", "elapsed_time"]),
        distanceMeters: numberFrom(activity, ["distance"]),
      };
    }

    const current = activities
      .filter((a) => {
        const d = new Date(dateValue(a));
        return !Number.isNaN(d.getTime()) && d >= sevenAgo;
      })
      .map(mapActivity);

    const previous = activities
      .filter((a) => {
        const d = new Date(dateValue(a));
        return !Number.isNaN(d.getTime()) && d >= fourteenAgo && d < sevenAgo;
      })
      .map(mapActivity);

    let subjectiveFeedback: Array<Record<string, unknown>> = [];
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("session_feedback")
          .select("session_date, session_name, rpe, breathlessness, legs, quality, note")
          .eq("user_id", user.id)
          .gte("session_date", iso(sevenAgo))
          .order("session_date", { ascending: false })
          .limit(10);
        subjectiveFeedback = data ?? [];
      }
    }

    const ai = await fetch("https://api.openai.com/v1/responses", {
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
              text: "Geef een korte, motiverende maar feitelijke weekreview voor een voetballer die zijn conditie wil verbeteren en kracht wil behouden. Gebruik zowel objectieve activity-data als subjectieve session feedback als die aanwezig is. Vergelijk alleen wat daadwerkelijk in de data staat. Noem concrete progressie als die aantoonbaar is; anders zeg dat er nog te weinig data is. Als de gebruiker meldt dat hij eerder buiten adem was of benen leegliepen, mag je dat samenvatten maar niet als medisch oordeel. Antwoord uitsluitend volgens JSON-schema."
            }]
          },
          {
            role: "user",
            content: [{
              type: "input_text",
              text: JSON.stringify({ currentWeek: current, previousWeek: previous, subjectiveFeedback })
            }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "weekly_review",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                wins: { type: "array", items: { type: "string" }, maxItems: 3 },
                improve: { type: "array", items: { type: "string" }, maxItems: 3 },
                football: { type: "string" },
                conditioning: { type: "string" },
                motivation: { type: "string" }
              },
              required: ["title","wins","improve","football","conditioning","motivation"]
            }
          }
        }
      })
    });

    if (!ai.ok) {
      return NextResponse.json({ error: `OpenAI HTTP ${ai.status}` }, { status: 502 });
    }

    const raw = (await ai.json()) as Record<string, unknown>;
    const text = outputText(raw);
    if (!text) return NextResponse.json({ error: "Geen review ontvangen" }, { status: 502 });

    return NextResponse.json({
      review: JSON.parse(text),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
