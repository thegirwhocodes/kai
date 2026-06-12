import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Kai Focus pricing for the adaptive AI focus coach, productivity trends, calendar planning, voice, and Spotify music.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    body: "For trying Kai as a calm focus room.",
    features: [
      "Adaptive timer",
      "Tasks and breaks",
      "Basic voice controls",
      "Daily focus history",
      "Spotify controls when connected",
    ],
  },
  {
    name: "Kai Plus",
    price: "$9/mo",
    body: "For people who want Kai to organize the day, not just time it.",
    features: [
      "30-day trial",
      "Kai Trends",
      "Calendar-aware recommendations",
      "Gmail history and draft support",
      "Weekly reports",
      "Advanced music insights",
    ],
  },
  {
    name: "Founding",
    price: "$49/yr",
    body: "For early testers who help shape the product.",
    features: [
      "90-day founding beta",
      "Founder pricing window",
      "Feedback calls optional",
      "Early access to Lock-In Radio",
      "Tester badge in account history",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <div className="mx-auto max-w-6xl">
        <Nav />
        <section className="py-16">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#ffd9c2]">
            Pricing
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight">
            Start free. Upgrade when Kai starts learning your patterns.
          </h1>
          <p className="mt-5 max-w-2xl leading-8 text-white/68">
            Kai Focus should prove itself before it asks for money. The public
            plan is a generous free tier plus a 30-day Kai Plus trial once
            Trends is fully live.
          </p>
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="public-card rounded-lg p-6"
            >
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-4 text-4xl font-semibold">{plan.price}</p>
              <p className="mt-4 leading-7 text-white/68">{plan.body}</p>
              <ul className="mt-6 space-y-3 text-sm text-white/78">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
        <div className="mt-10">
          <Link href="/app" className="btn-primary inline-flex">
            Open Kai
          </Link>
        </div>
      </div>
    </main>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold">
        Kai Focus
      </Link>
      <Link href="/app" className="btn-ghost">
        Open app
      </Link>
    </nav>
  );
}
