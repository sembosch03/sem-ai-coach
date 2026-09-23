"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase is nog niet ingesteld.");
      return;
    }

    setMessage("Bezig...");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account gemaakt. Controleer je e-mail als bevestiging aan staat.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-sm text-emerald-400">SEM PERFORMANCE</p>
        <h1 className="mt-2 text-3xl font-bold">
          {mode === "login" ? "Inloggen" : "Account maken"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Je persoonlijke trainingsdata en instellingen blijven gekoppeld aan je account.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Wachtwoord"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none"
          />

          <button className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black">
            {mode === "login" ? "Inloggen" : "Account maken"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="mt-6 text-sm text-emerald-400"
        >
          {mode === "login" ? "Nog geen account? Maak er één" : "Heb je al een account? Log in"}
        </button>
      </div>
    </main>
  );
}
