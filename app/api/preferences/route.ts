import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const defaults = {
  tuesdayFootball: true,
  thursdayFootball: true,
  sundayMatch: true,
  gymDaysTarget: 5,
  legDayTarget: 1,
  extraNote: "",
};

function toClient(row: Record<string, unknown> | null) {
  if (!row) return defaults;
  return {
    tuesdayFootball: row.tuesday_football ?? true,
    thursdayFootball: row.thursday_football ?? true,
    sundayMatch: row.sunday_match ?? true,
    gymDaysTarget: row.gym_days_target ?? 5,
    legDayTarget: row.leg_day_target ?? 1,
    extraNote: row.extra_note ?? "",
  };
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ mode: "local", preferences: defaults });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
    .from("coach_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "cloud", preferences: toClient(data) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const preferences = {
    tuesdayFootball: Boolean(body.tuesdayFootball),
    thursdayFootball: Boolean(body.thursdayFootball),
    sundayMatch: Boolean(body.sundayMatch),
    gymDaysTarget: Math.min(7, Math.max(1, Number(body.gymDaysTarget) || 5)),
    legDayTarget: Math.min(3, Math.max(0, Number(body.legDayTarget) || 0)),
    extraNote: typeof body.extraNote === "string" ? body.extraNote.slice(0, 500) : "",
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ mode: "local", preferences });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { error } = await supabase.from("coach_preferences").upsert({
    user_id: user.id,
    tuesday_football: preferences.tuesdayFootball,
    thursday_football: preferences.thursdayFootball,
    sunday_match: preferences.sundayMatch,
    gym_days_target: preferences.gymDaysTarget,
    leg_day_target: preferences.legDayTarget,
    extra_note: preferences.extraNote,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "cloud", preferences });
}
