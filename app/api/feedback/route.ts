import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", feedback: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
    .from("session_feedback")
    .select("*")
    .eq("user_id", user.id)
    .order("session_date", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    mode: "cloud",
    feedback: (data ?? []).map((row) => ({
      date: row.session_date,
      sessionName: row.session_name,
      rpe: row.rpe,
      breathlessness: row.breathlessness,
      legs: row.legs,
      quality: row.quality,
      note: row.note ?? "",
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const feedback = {
    date: typeof body.date === "string" ? body.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    sessionName: typeof body.sessionName === "string" ? body.sessionName.slice(0, 120) : "Training",
    rpe: Math.min(10, Math.max(1, Number(body.rpe) || 5)),
    breathlessness: Math.min(10, Math.max(0, Number(body.breathlessness) || 5)),
    legs: Math.min(10, Math.max(0, Number(body.legs) || 5)),
    quality: Math.min(10, Math.max(0, Number(body.quality) || 7)),
    note: typeof body.note === "string" ? body.note.slice(0, 700) : "",
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", feedback });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { error } = await supabase.from("session_feedback").insert({
    user_id: user.id,
    session_date: feedback.date,
    session_name: feedback.sessionName,
    rpe: feedback.rpe,
    breathlessness: feedback.breathlessness,
    legs: feedback.legs,
    quality: feedback.quality,
    note: feedback.note,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "cloud", feedback });
}
