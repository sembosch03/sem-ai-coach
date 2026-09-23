import TopNav from "@/components/TopNav";
import AthleteProfile from "@/components/AthleteProfile";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
