import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const defaults = {
  energy: 7,
  legSoreness: 3,
  shinPain: 0,
  motivation: 7,
  availableMinutes: 75,
  note: "",
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", checkIn: defaults });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", today())
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ mode: "cloud", checkIn: defaults });

  return NextResponse.json({
    mode: "cloud",
    checkIn: {
      energy: data.energy,
      legSoreness: data.leg_soreness,
      shinPain: data.shin_pain,
      motivation: data.motivation,
      availableMinutes: data.available_minutes,
      note: data.note ?? "",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const checkIn = {
    energy: Math.min(10, Math.max(0, Number(body.energy) || 0)),
    legSoreness: Math.min(10, Math.max(0, Number(body.legSoreness) || 0)),
    shinPain: Math.min(10, Math.max(0, Number(body.shinPain) || 0)),
    motivation: Math.min(10, Math.max(0, Number(body.motivation) || 0)),
    availableMinutes: Math.min(240, Math.max(15, Number(body.availableMinutes) || 60)),
    note: typeof body.note === "string" ? body.note.slice(0, 500) : "",
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "local", checkIn });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { error } = await supabase.from("daily_checkins").upsert({
    user_id: user.id,
    checkin_date: today(),
    energy: checkIn.energy,
    leg_soreness: checkIn.legSoreness,
    shin_pain: checkIn.shinPain,
    motivation: checkIn.motivation,
    available_minutes: checkIn.availableMinutes,
    note: checkIn.note,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "cloud", checkIn });
}
