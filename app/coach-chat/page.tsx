import TopNav from "@/components/TopNav";
import CoachChat from "@/components/CoachChat";

export default function CoachChatPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page-narrow">
        <CoachChat />
      </div>
    </main>
  );
}
