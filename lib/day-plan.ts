import type { CoachAssessment } from "./coach";

export type DayPlan = {
  day: string;
  primary: string;
  gym: string;
  conditioning: string;
  target: string;
  note: string;
};

const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Amsterdam",
  weekday: "long",
});

export function buildDayPlan(coach: CoachAssessment, now = new Date()): DayPlan {
  const day = weekday.format(now);

  const footballDay = day === "Tuesday" || day === "Thursday";
  const matchDay = day === "Sunday";

  if (coach.status === "REST") {
    return {
      day,
      primary: matchDay ? "Match alleen als je je goed voelt" : "Herstel",
      gym: "Geen zware beentraining",
      conditioning: "Geen extra intervals",
      target: "RPE 2–4/10",
      note: "Herstelstatus heeft prioriteit. Kies wandelen, mobiliteit of volledige rust.",
    };
  }

  if (matchDay) {
    return {
      day,
      primary: "Voetbalwedstrijd",
      gym: "Geen benen vóór de wedstrijd",
      conditioning: "Wedstrijd is je conditioning",
      target: coach.status === "EASY" ? "Beheerst starten" : "Normale wedstrijdbelasting",
      note: "Gebruik warming-up en eigen gevoel als laatste check.",
    };
  }

  if (footballDay) {
    return {
      day,
      primary: "Voetbaltraining",
      gym: coach.status === "EASY" ? "Optioneel lichte upper body" : "Upper body kan, liever geen zware benen",
      conditioning: "Geen extra harde intervals",
      target: coach.status === "EASY" ? "RPE 5–6/10" : "RPE 6–8/10",
      note: "De voetbaltraining telt als belangrijkste conditieprikkel van vandaag.",
    };
  }

  if (coach.status === "EASY") {
    return {
      day,
      primary: "Krachttraining licht / herstel",
      gym: "Upper body of lichte full body",
      conditioning: "20–30 min rustige zone 2",
      target: "RPE 5–6/10",
      note: "Geen dubbele zware prikkel vandaag.",
    };
  }

  if (coach.status === "HARD") {
    return {
      day,
      primary: "Kracht + conditionele prikkel",
      gym: "Normale krachtsessie",
      conditioning: "Korte intervals of zone 2, afhankelijk van benen",
      target: "RPE 7–8/10",
      note: "Goede dag voor progressie, maar houd zondag en voetbaltrainingen in beeld.",
    };
  }

  return {
    day,
    primary: "Normale trainingsdag",
    gym: "Normale krachtsessie",
    conditioning: "20–40 min zone 2 of rust als benen zwaar zijn",
    target: "RPE 6–7/10",
    note: "Bouw conditie zonder onnodig herstel van voetbal of kracht te saboteren.",
  };
}
