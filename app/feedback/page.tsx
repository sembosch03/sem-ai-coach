import TopNav from "@/components/TopNav";
import SessionFeedback from "@/components/SessionFeedback";

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <SessionFeedback />
      </div>
    </main>
  );
}
