import { NextResponse } from "next/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

const iso = (date: Date) => date.toISOString().slice(0, 10);

function isFootball(a: DataRow) {
  const hay = [
    textFrom(a, ["name"]),
    textFrom(a, ["type"]),
    textFrom(a, ["sport"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /football|soccer|voetbal/.test(hay);
}

function isConditioning(a: DataRow) {
  const hay = [
    textFrom(a, ["name"]),
    textFrom(a, ["type"]),
    textFrom(a, ["sport"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /run|running|cardio|cycle|cycling|bike|row|rowing|elliptical|walk|football|soccer|voetbal/.test(hay);
}

export async function GET() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/0/activities?${query}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );

    const activities = response.ok ? ((await response.json()) as DataRow[]) : [];
    activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);
    const last28 = new Date(now);
    last28.setDate(now.getDate() - 28);

    const inRange = (a: DataRow, start: Date) => {
      const d = new Date(dateValue(a));
      return !Number.isNaN(d.getTime()) && d >= start;
    };

    const week = activities.filter((a) => inRange(a, last7));
    const month = activities.filter((a) => inRange(a, last28));
    const football7 = week.filter(isFootball).length;
    const conditioning7 = week.filter(isConditioning).length;
    const football28 = month.filter(isFootball).length;
    const conditioning28 = month.filter(isConditioning).length;

    const totalMinutes7 = Math.round(
      week.reduce((sum, a) => sum + (numberFrom(a, ["moving_time", "elapsed_time"]) ?? 0), 0) / 60
    );
    const distanceKm7 =
      week.reduce((sum, a) => sum + (numberFrom(a, ["distance"]) ?? 0), 0) / 1000;

    const xp =
      month.length * 50 +
      football28 * 35 +
      conditioning28 * 20 +
      Math.min(300, Math.round(totalMinutes7));

    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const levelXp = xp % 500;

    const trophies = [
      {
        id: "first-steps",
        name: "Kickoff",
        icon: "🏁",
        unlocked: month.length >= 1,
        progress: Math.min(1, month.length / 1),
        detail: "Eerste training gelogd",
      },
      {
        id: "consistent-5",
        name: "Locked In",
        icon: "🔥",
        unlocked: week.length >= 5,
        progress: Math.min(1, week.length / 5),
        detail: "5 activiteiten in 7 dagen",
      },
      {
        id: "football-engine",
        name: "Football Engine",
        icon: "⚽",
        unlocked: football7 >= 2,
        progress: Math.min(1, football7 / 2),
        detail: "2 voetbalsessies in 7 dagen",
      },
      {
        id: "conditioning",
        name: "Engine Builder",
        icon: "🫁",
        unlocked: conditioning7 >= 3,
        progress: Math.min(1, conditioning7 / 3),
        detail: "3 conditieprikkels in 7 dagen",
      },
      {
        id: "volume-180",
        name: "Workhorse",
        icon: "🏆",
        unlocked: totalMinutes7 >= 180,
        progress: Math.min(1, totalMinutes7 / 180),
        detail: "180 trainingsminuten in 7 dagen",
      },
      {
        id: "distance-10",
        name: "Ten K Week",
        icon: "🚀",
        unlocked: distanceKm7 >= 10,
        progress: Math.min(1, distanceKm7 / 10),
        detail: "10 km beweging in 7 dagen",
      },
    ];

    return NextResponse.json({
      xp,
      level,
      levelXp,
      nextLevelXp: 500,
      stats: {
        activities7: week.length,
        football7,
        conditioning7,
        totalMinutes7,
        distanceKm7: Math.round(distanceKm7 * 10) / 10,
      },
      trophies,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
