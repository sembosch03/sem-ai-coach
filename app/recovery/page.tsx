import TopNav from "@/components/TopNav";
import RecoveryLab from "@/components/RecoveryLab";

export default function RecoveryPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <RecoveryLab />
      </div>
    </main>
  );
}
