import TopNav from "@/components/TopNav";
import ProgressionEngine from "@/components/ProgressionEngine";

export default function ProgressPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <div className="mb-5">
          <p className="text-xs text-cyan-300">PERFORMANCE ANALYTICS</p>
          <h1 className="mt-1 text-3xl font-bold">Progress</h1>
          <p className="mt-2 text-sm text-zinc-500">Zie wat er echt verandert in je voetbalmotor en trainingsvolume.</p>
        </div>
        <ProgressionEngine />
      </div>
    </main>
  );
}
