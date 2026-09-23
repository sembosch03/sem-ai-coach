import TopNav from "@/components/TopNav";
import MatchCenter from "@/components/MatchCenter";

export default function MatchCenterPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <MatchCenter />
      </div>
    </main>
  );
}
