import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dateValue, numberFrom, type DataRow } from "@/lib/coach";

const iso = (date: Date) => date.toISOString().slice(0, 10);

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function latestNumber(rows: DataRow[], keys: string[]) {
  for (const row of rows) {
    const value = numberFrom(row, keys);
    if (value !== null) return value;
  }
  return null;
}

export async function GET() {
  const intervalsKey = process.env.INTERVALS_API_KEY;
  if (!intervalsKey) return NextResponse.json({ error: "INTERVALS_API_KEY ontbreekt" }, { status: 500 });

  try {
    const auth = Buffer.from(`API_KEY:${intervalsKey}`).toString("base64");
    const newest = new Date();
    const oldest = new Date();
    oldest.setDate(newest.getDate() - 21);
    const query = `oldest=${iso(oldest)}&newest=${iso(newest)}`;

    const [wellnessResponse, activitiesResponse] = await Promise.all([
      fetch(`https://intervals.icu/api/v1/athlete/0/wellness?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`https://intervals.icu/api/v1/athlete/0/activities?${query}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
    ]);

    const wellness = wellnessResponse.ok ? ((await wellnessResponse.json()) as DataRow[]) : [];
    const activities = activitiesResponse.ok ? ((await activitiesResponse.json()) as DataRow[]) : [];
    wellness.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));
    activities.sort((a, b) => dateValue(b).localeCompare(dateValue(a)));

    const sleepScore = latestNumber(wellness, ["sleepScore", "sleep_score"]);
    const sleepSecs = latestNumber(wellness, ["sleepSecs", "sleep_secs"]);
    const hrv = latestNumber(wellness, ["hrv", "hrv_rmssd", "rmssd"]);
    const restingHr = latestNumber(wellness, ["restingHR", "resting_hr", "restingHr"]);
    const fatigue = latestNumber(wellness, ["atl", "icu_atl", "fatigue"]);
    const fitness = latestNumber(wellness, ["ctl", "icu_ctl", "fitness"]);
    const form = latestNumber(wellness, ["tsb", "icu_tsb", "form"]) ??
      (fitness !== null && fatigue !== null ? fitness - fatigue : null);

    let checkIn = {
      energy: 7,
      legSoreness: 3,
      shinPain: 0,
      motivation: 7,
      availableMinutes: 75,
      note: "",
    };

    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = iso(new Date());
        const { data } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", user.id)
          .eq("checkin_date", today)
          .maybeSingle();
        if (data) {
          checkIn = {
            energy: data.energy,
            legSoreness: data.leg_soreness,
            shinPain: data.shin_pain,
            motivation: data.motivation,
            availableMinutes: data.available_minutes,
            note: data.note ?? "",
          };
        }
      }
    }

    let recovery = 70;
    const factors: Array<{ label: string; impact: number; text: string }> = [];

    if (sleepScore !== null) {
      const impact = clamp((sleepScore - 70) * 0.45, -18, 14);
      recovery += impact;
      factors.push({
        label: "Sleep",
        impact: Math.round(impact),
        text: `Sleep score ${Math.round(sleepScore)}`,
      });
    } else if (sleepSecs !== null) {
      const hours = sleepSecs / 3600;
      const impact = clamp((hours - 7) * 7, -18, 12);
      recovery += impact;
      factors.push({
        label: "Sleep",
        impact: Math.round(impact),
        text: `${hours.toFixed(1)} uur slaap`,
      });
    }

    const energyImpact = (checkIn.energy - 6) * 4;
    recovery += energyImpact;
    factors.push({ label: "Energy", impact: Math.round(energyImpact), text: `${checkIn.energy}/10 energie` });

    const sorenessImpact = -(Math.max(0, checkIn.legSoreness - 3) * 4);
    recovery += sorenessImpact;
    factors.push({ label: "Legs", impact: Math.round(sorenessImpact), text: `${checkIn.legSoreness}/10 beenspierpijn` });

    const shinImpact = -(checkIn.shinPain * 3.5);
    recovery += shinImpact;
    factors.push({ label: "Shins", impact: Math.round(shinImpact), text: `${checkIn.shinPain}/10 shin-pijn` });

    if (form !== null) {
      const formImpact = clamp(form * 0.6, -12, 10);
      recovery += formImpact;
      factors.push({ label: "Form", impact: Math.round(formImpact), text: `Form ${Math.round(form)}` });
    }

    const readiness = Math.round(clamp(recovery));

    const footballReadiness = Math.round(clamp(
      readiness * 0.72 +
      checkIn.motivation * 2 +
      Math.max(0, 10 - checkIn.shinPain) * 0.8
    ));

    const conditioningScore = Math.round(clamp(
      45 +
      Math.min(25, activities.filter((a) => {
        const d = new Date(dateValue(a));
        const seven = new Date();
        seven.setDate(seven.getDate() - 7);
        return !Number.isNaN(d.getTime()) && d >= seven;
      }).length * 5) +
      (fitness ?? 0) * 0.4
    ));

    const status =
      checkIn.shinPain >= 7 ? "PROTECT" :
      readiness >= 80 ? "GO" :
      readiness >= 60 ? "CONTROLLED" :
      "RECOVER";

    const recommendation =
      status === "PROTECT"
        ? "Vermijd extra impactwerk. Kies low-impact conditioning en geen extra sprint-/loopsessie."
        : status === "GO"
          ? "Goede trainingsruimte. Een gerichte conditieprikkel kan passen als wedstrijdplanning dat toelaat."
          : status === "CONTROLLED"
            ? "Train normaal maar doseer extra conditie. Geen onnodige dubbele zware prikkels."
            : "Herstel heeft voorrang. Hou de conditieprikkel rustig of sla extra werk over.";

    return NextResponse.json({
      readiness,
      footballReadiness,
      conditioningScore,
      status,
      recommendation,
      factors,
      signals: {
        sleepScore,
        sleepHours: sleepSecs !== null ? Math.round((sleepSecs / 3600) * 10) / 10 : null,
        hrv,
        restingHr,
        fitness,
        fatigue,
        form,
      },
      checkIn,
      disclaimer: "Training-readiness is een coachinghulpmiddel en geen medische beoordeling.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
  }
}
