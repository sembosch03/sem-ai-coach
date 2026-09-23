import TopNav from "@/components/TopNav";
import CoachChat from "@/components/CoachChat";

export default function CoachChatPage() {
  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <CoachChat />
      </div>
    </main>
  );
}
