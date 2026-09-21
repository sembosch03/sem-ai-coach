const cards = [
  { title: "Readiness", value: "--", sub: "Wachten op Garmin health data" },
  { title: "Fitness", value: "1", sub: "Intervals.icu fitness" },
  { title: "Fatigue", value: "2", sub: "Huidige vermoeidheid" },
  { title: "Form", value: "-1", sub: "Training balance" },
  { title: "HRV", value: "-- ms", sub: "Garmin" },
  { title: "Sleep", value: "--", sub: "Garmin sleep score" },
  { title: "Resting HR", value: "-- bpm", sub: "Garmin" },
  { title: "Weekly Load", value: "--", sub: "Alle trainingen" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">SEM PERFORMANCE</p>
            <h1 className="text-4xl font-bold">AI Football Coach</h1>
            <p className="mt-2 text-zinc-400">
              Football · Conditioning · Strength · Recovery
            </p>
          </div>

          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
            Garmin ● Connected
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-sm text-zinc-400">{card.title}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
              <p className="mt-2 text-xs text-zinc-500">{card.sub}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
            <p className="text-sm text-zinc-400">TODAY'S TRAINING</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Football Training
            </h2>
            <p className="mt-3 text-zinc-400">
              Tomorrow: first team training and conditioning baseline.
            </p>

            <div className="mt-6 h-2 rounded-full bg-zinc-800">
              <div className="h-2 w-1/3 rounded-full bg-emerald-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-6">
            <p className="text-sm text-emerald-400">AI COACH</p>
            <h2 className="mt-2 text-xl font-semibold">Coach Analysis</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Garmin health history is being imported. Once HRV, sleep and
              resting heart rate are available, your readiness model will
              activate.
            </p>

            <button className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
              Ask AI Coach
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">WEEK</p>
              <h2 className="mt-1 text-xl font-semibold">Training Overview</h2>
            </div>

            <span className="text-sm text-zinc-500">
              Garmin + Intervals.icu
            </span>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-sm">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <div
                key={day}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <p className="text-zinc-500">{day}</p>
                <p className="mt-3 text-zinc-300">—</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
