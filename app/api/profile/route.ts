import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const defaults = {
  displayName: "Sem",
  team: "SV Hoofddorp",
  position: "",
  age: 22,
  heightCm: 180,
  weightKg: 80,
  primaryGoal: "Voetbalconditie verbeteren en kracht/spiermassa behouden",
  gymDaysTarget: 5,
  footballDaysTarget: 2,
  conditioningPriority: 5,
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", profile: defaults });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
    .from("athlete_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ mode: "cloud", profile: defaults });

  return NextResponse.json({
    mode: "cloud",
    profile: {
      displayName: data.display_name ?? "Sem",
      team: data.team ?? "",
      position: data.position ?? "",
      age: data.age ?? 22,
      heightCm: data.height_cm ?? 180,
      weightKg: data.weight_kg ?? 80,
      primaryGoal: data.primary_goal ?? defaults.primaryGoal,
      gymDaysTarget: data.gym_days_target ?? 5,
      footballDaysTarget: data.football_days_target ?? 2,
      conditioningPriority: data.conditioning_priority ?? 5,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const profile = {
    displayName: typeof body.displayName === "string" ? body.displayName.slice(0, 80) : "Sem",
    team: typeof body.team === "string" ? body.team.slice(0, 120) : "",
    position: typeof body.position === "string" ? body.position.slice(0, 80) : "",
    age: Math.min(100, Math.max(13, Number(body.age) || 22)),
    heightCm: Math.min(230, Math.max(130, Number(body.heightCm) || 180)),
    weightKg: Math.min(250, Math.max(35, Number(body.weightKg) || 80)),
    primaryGoal: typeof body.primaryGoal === "string" ? body.primaryGoal.slice(0, 300) : defaults.primaryGoal,
    gymDaysTarget: Math.min(7, Math.max(0, Number(body.gymDaysTarget) || 5)),
    footballDaysTarget: Math.min(7, Math.max(0, Number(body.footballDaysTarget) || 2)),
    conditioningPriority: Math.min(5, Math.max(1, Number(body.conditioningPriority) || 5)),
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", profile });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { error } = await supabase.from("athlete_profiles").upsert({
    user_id: user.id,
    display_name: profile.displayName,
    team: profile.team,
    position: profile.position,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    primary_goal: profile.primaryGoal,
    gym_days_target: profile.gymDaysTarget,
    football_days_target: profile.footballDaysTarget,
    conditioning_priority: profile.conditioningPriority,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "cloud", profile });
}
