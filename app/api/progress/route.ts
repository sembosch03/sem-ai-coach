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

    const activeWeeks = new Set<string>();
    for (const activity of activities) {
      const raw = dateValue(activity);
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) continue;
      const day = date.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(date);
      monday.setUTCDate(date.getUTCDate() + diff);
      activeWeeks.add(monday.toISOString().slice(0, 10));
    }
    const weeksActive42 = activeWeeks.size;
    const distanceKm7 =
      week.reduce((sum, a) => sum + (numberFrom(a, ["distance"]) ?? 0), 0) / 1000;
    const totalMinutes28 = Math.round(
      month.reduce((sum, a) => sum + (numberFrom(a, ["moving_time", "elapsed_time"]) ?? 0), 0) / 60
    );
    const distanceKm28 =
      month.reduce((sum, a) => sum + (numberFrom(a, ["distance"]) ?? 0), 0) / 1000;

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
      {
        id: "three-week-streak",
        name: "No Excuses",
        icon: "🛡️",
        unlocked: weeksActive42 >= 3,
        progress: Math.min(1, weeksActive42 / 3),
        detail: "Actief in 3 verschillende weken",
      },
      {
        id: "iron-week",
        name: "Iron Week",
        icon: "⚙️",
        unlocked: week.length >= 7,
        progress: Math.min(1, week.length / 7),
        detail: "7 activiteiten in 7 dagen",
      },
      {
        id: "football-triple",
        name: "Triple Threat",
        icon: "🥅",
        unlocked: football7 >= 3,
        progress: Math.min(1, football7 / 3),
        detail: "3 voetbalprikkels in 7 dagen",
      },
      {
        id: "engine-5",
        name: "Engine Room",
        icon: "🧠",
        unlocked: conditioning7 >= 5,
        progress: Math.min(1, conditioning7 / 5),
        detail: "5 conditieprikkels in 7 dagen",
      },
      {
        id: "volume-300",
        name: "300 Club",
        icon: "⏱️",
        unlocked: totalMinutes7 >= 300,
        progress: Math.min(1, totalMinutes7 / 300),
        detail: "300 trainingsminuten in 7 dagen",
      },
      {
        id: "distance-20",
        name: "Twenty K",
        icon: "🗺️",
        unlocked: distanceKm7 >= 20,
        progress: Math.min(1, distanceKm7 / 20),
        detail: "20 km beweging in 7 dagen",
      },
      {
        id: "month-20",
        name: "Monthly Grinder",
        icon: "📆",
        unlocked: month.length >= 20,
        progress: Math.min(1, month.length / 20),
        detail: "20 activiteiten in 28 dagen",
      },
      {
        id: "month-1000",
        name: "1000 Minute Month",
        icon: "⌛",
        unlocked: totalMinutes28 >= 1000,
        progress: Math.min(1, totalMinutes28 / 1000),
        detail: "1000 trainingsminuten in 28 dagen",
      },
      {
        id: "month-50k",
        name: "50K Movement",
        icon: "🌍",
        unlocked: distanceKm28 >= 50,
        progress: Math.min(1, distanceKm28 / 50),
        detail: "50 km beweging in 28 dagen",
      },
      {
        id: "six-week-run",
        name: "Built Different",
        icon: "👑",
        unlocked: weeksActive42 >= 6,
        progress: Math.min(1, weeksActive42 / 6),
        detail: "Actief in alle 6 recente weken",
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
        weeksActive42,
        totalMinutes28,
        distanceKm28: Math.round(distanceKm28 * 10) / 10,
      },
      missions: [
        {
          title: "Football Engine",
          done: football7 >= 2,
          progress: `${football7}/2 voetbalprikkels`,
          xp: 100,
        },
        {
          title: "Conditioning Builder",
          done: conditioning7 >= 3,
          progress: `${conditioning7}/3 conditieprikkels`,
          xp: 100,
        },
        {
          title: "Consistency",
          done: week.length >= 5,
          progress: `${week.length}/5 sessies`,
          xp: 100,
        },
      ],
      trophies,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
