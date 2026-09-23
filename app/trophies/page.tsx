import TopNav from "@/components/TopNav";
import TrophyCabinet from "@/components/TrophyCabinet";

export default function TrophiesPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <TrophyCabinet />
      </div>
    </main>
  );
}
