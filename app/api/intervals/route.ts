import { NextResponse } from "next/server";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function intervalsFetch(path: string, auth: string) {
  return fetch(`https://intervals.icu/api/v1${path}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
}

export async function GET() {
  const apiKey = process.env.INTERVALS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key ontbreekt" }, { status: 500 });
  }

  const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  const newest = new Date();
  const oldest = new Date();
  oldest.setDate(newest.getDate() - 42);

  const query = `oldest=${isoDate(oldest)}&newest=${isoDate(newest)}`;

  try {
    const [activitiesResponse, wellnessResponse] = await Promise.all([
      intervalsFetch(`/athlete/0/activities?${query}`, auth),
      intervalsFetch(`/athlete/0/wellness?${query}`, auth),
    ]);

    if (!activitiesResponse.ok) {
      return NextResponse.json(
        {
          error: "Intervals activities API fout",
          status: activitiesResponse.status,
          details: await activitiesResponse.text(),
        },
        { status: activitiesResponse.status }
      );
    }

    const activities = await activitiesResponse.json();

    let wellness = [];
    let wellnessWarning: string | null = null;

    if (wellnessResponse.ok) {
      wellness = await wellnessResponse.json();
    } else {
      wellnessWarning = `Wellness data nog niet beschikbaar (HTTP ${wellnessResponse.status})`;
    }

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      range: { oldest: isoDate(oldest), newest: isoDate(newest) },
      activities,
      wellness,
      wellnessWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Kon Intervals.icu niet bereiken",
        details: error instanceof Error ? error.message : "Onbekende fout",
      },
      { status: 500 }
    );
  }
}
