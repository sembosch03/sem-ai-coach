import TopNav from "@/components/TopNav";
import SessionFeedback from "@/components/SessionFeedback";

export default function FeedbackPage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <SessionFeedback />
      </div>
    </main>
  );
}
