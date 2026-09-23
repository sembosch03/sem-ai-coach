"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AuthBar({ email }: { email?: string | null }) {
  const supabase = createBrowserSupabaseClient();

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-3">
      {email && <span className="hidden text-xs text-zinc-500 sm:inline">{email}</span>}
      <button
        onClick={logout}
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
      >
        Uitloggen
      </button>
    </div>
  );
}
