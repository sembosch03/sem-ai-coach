import { NextResponse } from "next/server";
import { dateValue, numberFrom, type DataRow } from "@/lib/coach";

const iso = (date: Date) => date.toISOString().slice(0, 10);

export async function GET() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 30);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/0/wellness?${query}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );

    const rows = response.ok ? ((await response.json()) as DataRow[]) : [];
    rows.sort((a, b) => dateValue(a).localeCompare(dateValue(b)));

    const points = rows.map((row) => ({
      date: dateValue(row).slice(0, 10),
      sleepScore: numberFrom(row, ["sleepScore", "sleep_score"]),
      sleepHours: (() => {
        const sec = numberFrom(row, ["sleepSecs", "sleep_secs"]);
        return sec === null ? null : Math.round((sec / 3600) * 10) / 10;
      })(),
      hrv: numberFrom(row, ["hrv", "hrv_rmssd", "rmssd"]),
      restingHr: numberFrom(row, ["restingHR", "resting_hr", "restingHr"]),
      readiness: numberFrom(row, ["readiness", "readiness_score"]),
      fitness: numberFrom(row, ["ctl", "icu_ctl", "fitness"]),
      fatigue: numberFrom(row, ["atl", "icu_atl", "fatigue"]),
    }));

    const recent = points.slice(-14);
    const avg = (values: Array<number | null>) => {
      const clean = values.filter((v): v is number => v !== null);
      if (!clean.length) return null;
      return Math.round((clean.reduce((a, b) => a + b, 0) / clean.length) * 10) / 10;
    };

    return NextResponse.json({
      points: recent,
      averages: {
        sleepScore: avg(recent.map((p) => p.sleepScore)),
        sleepHours: avg(recent.map((p) => p.sleepHours)),
        hrv: avg(recent.map((p) => p.hrv)),
        restingHr: avg(recent.map((p) => p.restingHr)),
        readiness: avg(recent.map((p) => p.readiness)),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
  }
}
