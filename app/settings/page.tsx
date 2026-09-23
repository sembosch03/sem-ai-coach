import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function SettingsPage() {
  const integrations = [
    {
      name: "Intervals.icu",
      connected: Boolean(process.env.INTERVALS_API_KEY),
      detail: "Activities, Garmin wellness, load en performance data",
    },
    {
      name: "OpenAI",
      connected: Boolean(process.env.OPENAI_API_KEY),
      detail: `AI weekplanner, weekreview en coach chat · model: ${process.env.OPENAI_MODEL || "gpt-5-mini"}`,
    },
    {
      name: "Supabase",
      connected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      detail: "Login, profiel, check-ins, feedback en cloud-opslag",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs text-zinc-500">SYSTEM</p>
          <h1 className="mt-1 text-3xl font-bold">Settings & Integrations</h1>
          <p className="mt-2 text-sm text-zinc-500">Alleen verbindingsstatus — secrets worden nooit in de browser getoond.</p>
        </div>

        <section className="mt-6 grid gap-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{integration.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{integration.detail}</p>
                </div>
                <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (integration.connected ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300")}>
                  {integration.connected ? "CONNECTED" : "SETUP NEEDED"}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500">TOKEN STRATEGY</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-emerald-300">0-token features</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">Dashboard, recovery, progression, trophies, goals, history, readiness, conditioning lab en check-ins.</p>
            </div>
            <div className="rounded-xl bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-violet-300">AI on-demand</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">Week genereren/herplannen, weekreview en coach chat. Geen automatische AI-call bij page refresh.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5">
          <p className="text-xs text-amber-300">PRIVACY</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Zodra Supabase is ingesteld wordt het dashboard accountgebonden. Zonder login-configuratie kan een gedeelde deployment-URL je dashboard tonen, dus zet authenticatie aan voordat je persoonlijke data breder deelt.
          </p>
        </section>

        <Link href="/profile" className="mt-4 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
          ← Terug naar profiel
        </Link>
      </div>
    </main>
  );
}
