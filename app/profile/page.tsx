import TopNav from "@/components/TopNav";
import AthleteProfile from "@/components/AthleteProfile";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen pb-24 text-white">
      <TopNav />
      <div className="app-page">
        <div className="mb-3 flex justify-end">
          <Link href="/settings" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
            ⚙ Settings
          </Link>
        </div>
        <AthleteProfile />
      </div>
    </main>
  );
}
