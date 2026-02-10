"use client";
import React from "react";
import { motion } from "framer-motion";

export default function Pricing() {
  const plans = [
    { name: "Starter", price: "Rs 1,000", desc: "For small projects and prototypes", features: ["100 contacts/mo", "Basic templates", "Email support"] },
    { name: "Pro", price: "Rs 10,000", desc: "For growing teams", features: ["2,500 contacts/mo", "Advanced templates", "Priority email support"] },
    { name: "Enterprise", price: "Contact us", desc: "Custom plans for large teams", features: ["Custom limits", "SLA & onboarding", "Dedicated support"] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-black dark:via-zinc-900 dark:to-zinc-950">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">Pricing</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">Simple, predictable pricing that scales with you.</p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{plan.name}</div>
                  <div className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{plan.price}</div>
                </div>
                <div className="text-sm text-zinc-500">/mo</div>
              </div>

              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{plan.desc}</p>

              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-5 w-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Choose {plan.name}</button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
