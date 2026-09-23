import { NextResponse } from "next/server";
import { dateValue, numberFrom, textFrom, type DataRow } from "@/lib/coach";

const iso = (date: Date) => date.toISOString().slice(0, 10);

function isFootball(a: DataRow) {
  const hay = [textFrom(a, ["name"]), textFrom(a, ["type"]), textFrom(a, ["sport"])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /football|soccer|voetbal/.test(hay);
}

function isConditioning(a: DataRow) {
  const hay = [textFrom(a, ["name"]), textFrom(a, ["type"]), textFrom(a, ["sport"])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /run|running|cardio|cycle|cycling|bike|row|rowing|elliptical|football|soccer|voetbal/.test(hay);
}

function durationMin(a: DataRow) {
  const seconds = numberFrom(a, ["moving_time", "elapsed_time"]);
  return seconds === null ? null : seconds / 60;
}

function distanceKm(a: DataRow) {
  const meters = numberFrom(a, ["distance"]);
  return meters === null ? null : meters / 1000;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number | null, digits = 1) {
  if (value === null) return null;
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
}

function percentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function weekStartKey(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });

  const auth = Buffer.from(`API_KEY:${key}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 84);
  const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

  try {
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/0/activities?${query}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );

    const activities = response.ok ? ((await response.json()) as DataRow[]) : [];
    activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    const now = new Date();
    const d7 = new Date(now); d7.setDate(now.getDate() - 7);
    const d14 = new Date(now); d14.setDate(now.getDate() - 14);
    const d28 = new Date(now); d28.setDate(now.getDate() - 28);

    const validDate = (a: DataRow) => {
      const d = new Date(dateValue(a));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const current = activities.filter((a) => {
      const d = validDate(a);
      return d && d >= d7;
    });
    const previous = activities.filter((a) => {
      const d = validDate(a);
      return d && d >= d14 && d < d7;
    });
    const last28 = activities.filter((a) => {
      const d = validDate(a);
      return d && d >= d28;
    });

    function summarize(set: DataRow[]) {
      const football = set.filter(isFootball);
      const conditioning = set.filter(isConditioning);
      const minutes = set.map(durationMin).filter((v): v is number => v !== null);
      const footballMinutes = football.map(durationMin).filter((v): v is number => v !== null);
      const footballDistance = football.map(distanceKm).filter((v): v is number => v !== null);
      const footballAvgHr = football
        .map((a) => numberFrom(a, ["average_heartrate"]))
        .filter((v): v is number => v !== null);
      const footballMaxHr = football
        .map((a) => numberFrom(a, ["max_heartrate"]))
        .filter((v): v is number => v !== null);
      const loads = set
        .map((a) => numberFrom(a, ["icu_training_load", "training_load", "load"]))
        .filter((v): v is number => v !== null);

      return {
        sessions: set.length,
        footballSessions: football.length,
        conditioningSessions: conditioning.length,
        totalMinutes: round(minutes.reduce((a, b) => a + b, 0), 0),
        avgFootballMinutes: round(avg(footballMinutes)),
        avgFootballDistanceKm: round(avg(footballDistance)),
        avgFootballHr: round(avg(footballAvgHr), 0),
        avgFootballMaxHr: round(avg(footballMaxHr), 0),
        totalLoad: round(loads.reduce((a, b) => a + b, 0), 0),
      };
    }

    const currentSummary = summarize(current);
    const previousSummary = summarize(previous);

    const footballAll = activities.filter(isFootball);
    const conditioningAll = activities.filter(isConditioning);

    const longestFootball = footballAll
      .map((a) => ({ date: dateValue(a), name: textFrom(a, ["name"]) ?? "Football", value: durationMin(a) }))
      .filter((x): x is { date: string; name: string; value: number } => x.value !== null)
      .sort((a, b) => b.value - a.value)[0] ?? null;

    const farthestFootball = footballAll
      .map((a) => ({ date: dateValue(a), name: textFrom(a, ["name"]) ?? "Football", value: distanceKm(a) }))
      .filter((x): x is { date: string; name: string; value: number } => x.value !== null)
      .sort((a, b) => b.value - a.value)[0] ?? null;

    const biggestLoad = activities
      .map((a) => ({
        date: dateValue(a),
        name: textFrom(a, ["name", "type", "sport"]) ?? "Activity",
        value: numberFrom(a, ["icu_training_load", "training_load", "load"]),
      }))
      .filter((x): x is { date: string; name: string; value: number } => x.value !== null)
      .sort((a, b) => b.value - a.value)[0] ?? null;

    const weekMap = new Map<string, { sessions: number; football: number; conditioning: number; minutes: number }>();
    for (const a of activities) {
      const d = validDate(a);
      if (!d) continue;
      const key = weekStartKey(d);
      const currentWeek = weekMap.get(key) ?? { sessions: 0, football: 0, conditioning: 0, minutes: 0 };
      currentWeek.sessions += 1;
      if (isFootball(a)) currentWeek.football += 1;
      if (isConditioning(a)) currentWeek.conditioning += 1;
      currentWeek.minutes += durationMin(a) ?? 0;
      weekMap.set(key, currentWeek);
    }

    const weeklyTrend = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, stats]) => ({
        week,
        sessions: stats.sessions,
        football: stats.football,
        conditioning: stats.conditioning,
        minutes: Math.round(stats.minutes),
      }));

    const comparisons = [
      {
        key: "sessions",
        label: "Sessies",
        current: currentSummary.sessions,
        previous: previousSummary.sessions,
        change: percentChange(currentSummary.sessions, previousSummary.sessions),
        unit: "",
      },
      {
        key: "footballMinutes",
        label: "Gem. voetbalduur",
        current: currentSummary.avgFootballMinutes,
        previous: previousSummary.avgFootballMinutes,
        change: percentChange(currentSummary.avgFootballMinutes, previousSummary.avgFootballMinutes),
        unit: " min",
      },
      {
        key: "footballDistance",
        label: "Gem. voetbalafstand",
        current: currentSummary.avgFootballDistanceKm,
        previous: previousSummary.avgFootballDistanceKm,
        change: percentChange(currentSummary.avgFootballDistanceKm, previousSummary.avgFootballDistanceKm),
        unit: " km",
      },
      {
        key: "load",
        label: "Weekload",
        current: currentSummary.totalLoad,
        previous: previousSummary.totalLoad,
        change: percentChange(currentSummary.totalLoad, previousSummary.totalLoad),
        unit: "",
      },
    ];

    const signals: string[] = [];
    const durationChange = percentChange(currentSummary.avgFootballMinutes, previousSummary.avgFootballMinutes);
    const distanceChange = percentChange(currentSummary.avgFootballDistanceKm, previousSummary.avgFootballDistanceKm);
    if (durationChange !== null && durationChange >= 10) {
      signals.push(`Gemiddelde voetbalduur is ${Math.round(durationChange)}% hoger dan vorige week.`);
    }
    if (distanceChange !== null && distanceChange >= 10) {
      signals.push(`Gemiddelde voetbalafstand is ${Math.round(distanceChange)}% hoger dan vorige week.`);
    }
    if (currentSummary.conditioningSessions >= 2) {
      signals.push("Je hebt deze week minimaal 2 conditioningsprikkels geraakt.");
    }
    if (!signals.length) {
      signals.push("Nog te weinig stabiele vergelijkingsdata voor een harde progressieclaim — blijf loggen.");
    }

    const challenge =
      currentSummary.conditioningSessions < 2
        ? {
            title: "Engine Challenge",
            target: "Pak 2 gerichte conditieprikkels deze week",
            reason: "Genoeg om progressie te maken zonder voetbal + gym te verdringen.",
          }
        : currentSummary.footballSessions < 2
          ? {
              title: "Football Volume",
              target: "Raak 2 voetbalprikkels deze week",
              reason: "Specificiteit blijft belangrijk voor voetbalconditie.",
            }
          : {
              title: "Consistency Lock",
              target: "Hou deze week minimaal 5 totale sessies vast zonder herstel te slopen",
              reason: "Nu draait winst vooral om consistente kwaliteit.",
            };

    return NextResponse.json({
      current: currentSummary,
      previous: previousSummary,
      last28: summarize(last28),
      comparisons,
      records: {
        longestFootball: longestFootball ? { ...longestFootball, value: round(longestFootball.value) } : null,
        farthestFootball: farthestFootball ? { ...farthestFootball, value: round(farthestFootball.value) } : null,
        biggestLoad: biggestLoad ? { ...biggestLoad, value: round(biggestLoad.value, 0) } : null,
      },
      weeklyTrend,
      signals,
      challenge,
      dataDepth: {
        activities: activities.length,
        football: footballAll.length,
        conditioning: conditioningAll.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
