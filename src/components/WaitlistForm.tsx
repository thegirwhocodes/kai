"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm({
  variant = "hero",
}: {
  variant?: "hero" | "band";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setMessage("Please enter a valid email.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: variant }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
      setMessage("You're on the list. We'll email you when early access opens.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <p
        className={`rounded-2xl border border-[#6fe3c8]/40 bg-[#6fe3c8]/10 px-5 py-4 text-sm font-medium text-[#bff3e6] ${
          variant === "hero" ? "max-w-md" : ""
        }`}
        role="status"
      >
        ✦ {message}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`w-full ${variant === "hero" ? "max-w-md" : "max-w-lg"}`}
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`waitlist-${variant}`} className="sr-only">
          Email address
        </label>
        <input
          id={`waitlist-${variant}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@example.com"
          className="w-full flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-base text-white placeholder-white/45 outline-none transition focus:border-[#fb7a8e]/70 focus:bg-white/[0.14]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : "Get early access"}
        </button>
      </div>
      <p
        className={`mt-2 min-h-[1.25rem] text-sm ${
          status === "error" ? "text-[#fb7a8e]" : "text-white/55"
        }`}
        aria-live="polite"
      >
        {status === "error" ? message : "Free to start · No credit card · No spam"}
      </p>
    </form>
  );
}
