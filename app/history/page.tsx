import TopNav from "@/components/TopNav";
import TrainingHistory from "@/components/TrainingHistory";

export default function HistoryPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <TrainingHistory />
      </div>
    </main>
  );
}
