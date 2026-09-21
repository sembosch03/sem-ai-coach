export type DataRow = Record<string, unknown>;

export type CoachAssessment = {
  status: "REST" | "EASY" | "NORMAL" | "HARD" | "WAITING";
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};

export function numberFrom(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function textFrom(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function dateValue(row: DataRow) {
  return textFrom(row, ["date", "start_date_local", "start_date", "icu_date"]) ?? "";
}

export function assessCoach(latest: DataRow | undefined, weeklyLoad: number | null): CoachAssessment {
  if (!latest) {
    return {
      status: "WAITING",
      title: "Meer hersteldata nodig",
      summary: "De coach wacht op Garmin wellnessdata voordat hij trainingsintensiteit aanpast.",
      confidence: "low",
      reasons: ["Geen recente wellnessmeting beschikbaar"],
    };
  }

  const sleep = numberFrom(latest, ["sleepScore", "sleep_score"]);
  const restingHr = numberFrom(latest, ["restingHR", "resting_hr", "restingHr"]);
  const hrv = numberFrom(latest, ["hrv", "hrv_rmssd", "rmssd"]);
  const fitness = numberFrom(latest, ["ctl", "icu_ctl", "fitness"]);
  const fatigue = numberFrom(latest, ["atl", "icu_atl", "fatigue"]);
  const formRaw = numberFrom(latest, ["tsb", "icu_tsb", "form"]);
  const form = formRaw ?? (fitness !== null && fatigue !== null ? fitness - fatigue : null);

  const reasons: string[] = [];
  let risk = 0;
  let positive = 0;
  let signals = 0;

  if (sleep !== null) {
    signals++;
    if (sleep < 60) { risk += 2; reasons.push(`Lage slaapscore (${Math.round(sleep)})`); }
    else if (sleep < 75) { risk++; reasons.push(`Slaap kan beter (${Math.round(sleep)})`); }
    else { positive++; reasons.push(`Goede slaapscore (${Math.round(sleep)})`); }
  }

  if (form !== null) {
    signals++;
    if (form < -20) { risk += 2; reasons.push(`Hoge trainingsvermoeidheid (form ${Math.round(form)})`); }
    else if (form < -10) { risk++; reasons.push(`Negatieve form (${Math.round(form)})`); }
    else if (form > 5) { positive++; reasons.push(`Positieve form (+${Math.round(form)})`); }
    else reasons.push(`Form rond neutraal (${Math.round(form)})`);
  }

  if (hrv !== null) { signals++; reasons.push(`HRV ${Math.round(hrv)} ms beschikbaar voor trendanalyse`); }
  if (restingHr !== null) { signals++; reasons.push(`Rusthartslag ${Math.round(restingHr)} bpm beschikbaar voor trendanalyse`); }
  if (weeklyLoad !== null) reasons.push(`Weekbelasting ${Math.round(weeklyLoad)}`);

  if (risk >= 3) return { status: "REST", title: "Herstel prioriteit", summary: "Meerdere beschikbare signalen wijzen op verhoogde belasting. Houd de sessie licht of kies herstel.", confidence: signals >= 3 ? "high" : "medium", reasons };
  if (risk >= 1) return { status: "EASY", title: "Train gecontroleerd", summary: "Er zijn herstel- of vermoeidheidssignalen. Vermijd extra zware conditioning bovenop je geplande training.", confidence: signals >= 3 ? "high" : "medium", reasons };
  if (positive >= 2) return { status: "HARD", title: "Goede trainingsruimte", summary: "De beschikbare herstel- en belastingssignalen zijn gunstig. Een normale tot stevige geplande sessie past hierbij.", confidence: signals >= 3 ? "high" : "medium", reasons };
  return { status: "NORMAL", title: "Normale trainingsdag", summary: "Er zijn geen sterke alarmsignalen in de beschikbare data. Volg je geplande sessie en gebruik gevoel/RPE als extra check.", confidence: signals >= 3 ? "medium" : "low", reasons };
}
