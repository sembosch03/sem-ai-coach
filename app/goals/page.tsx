import TopNav from "@/components/TopNav";
import GoalTracker from "@/components/GoalTracker";

export default function GoalsPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <GoalTracker />
      </div>
    </main>
  );
}
