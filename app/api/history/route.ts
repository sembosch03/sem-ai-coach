import { NextResponse } from "next/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

export async function GET() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 120);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/0/activities?${query}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );

    const rows = response.ok ? ((await response.json()) as DataRow[]) : [];
    rows.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    return NextResponse.json({
      activities: rows.slice(0, 100).map((a) => ({
        id: String(a.id ?? dateValue(a)),
        date: dateValue(a),
        name: textFrom(a, ["name", "type", "sport"]) ?? "Activity",
        sport: textFrom(a, ["type", "sport"]) ?? "Activity",
        source: textFrom(a, ["source"]) ?? "Intervals",
        load: numberFrom(a, ["icu_training_load", "training_load", "load"]),
        durationMin: (() => {
          const sec = numberFrom(a, ["moving_time", "elapsed_time"]);
          return sec === null ? null : Math.round(sec / 60);
        })(),
        distanceKm: (() => {
          const m = numberFrom(a, ["distance"]);
          return m === null ? null : Math.round((m / 1000) * 10) / 10;
        })(),
        avgHr: numberFrom(a, ["average_heartrate"]),
        maxHr: numberFrom(a, ["max_heartrate"]),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
  }
}
