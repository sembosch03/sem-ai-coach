"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; text: string };

const quickPrompts = [
  "Kan ik vandaag gym + voetbal doen?",
  "Welke conditioning past vandaag het best?",
  "Hoe moet ik trainen richting zondag?",
  "Mijn shins voelen gevoelig, wat pas ik aan?",
];

export default function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Vraag me iets over je training. Ik gebruik pas AI wanneer jij een bericht verstuurt." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(value = input) {
    const question = value.trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await response.json();
      setMessages((m) => [...m, {
        role: "assistant",
        text: response.ok ? data.answer : data.error ?? "Coach kon niet antwoorden.",
      }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Coach kon niet antwoorden." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs text-violet-300">AI COACH CHAT</p>
        <h1 className="mt-1 text-3xl font-bold">Vraag je coach</h1>
        <p className="mt-2 text-sm text-zinc-500">On-demand AI: geen tokens zolang je niets verstuurt.</p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button key={prompt} onClick={() => send(prompt)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:text-white">
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="min-h-[420px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={"flex " + (message.role === "user" ? "justify-end" : "justify-start")}>
              <div className={"max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 " + (message.role === "user" ? "bg-white text-black" : "bg-zinc-950 text-zinc-300")}>
                {message.text}
              </div>
            </div>
          ))}
          {loading && <div className="w-fit rounded-2xl bg-zinc-950 px-4 py-3 text-sm text-zinc-500">Coach denkt…</div>}
        </div>
      </section>

      <section className="sticky bottom-20 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur lg:bottom-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Bijv. ik ga morgen gymen en daarna voetballen, slim?"
            className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold disabled:opacity-40">
            Stuur
          </button>
        </div>
      </section>
    </div>
  );
}
