import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.INTERVALS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key ontbreekt" },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");

  const response = await fetch(
    "https://intervals.icu/api/v1/athlete/0/activities?oldest=2026-08-01&newest=2026-09-21",
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Intervals API fout",
        status: response.status,
        details: await response.text(),
      },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json());
}