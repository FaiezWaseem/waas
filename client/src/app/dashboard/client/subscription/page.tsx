"use client";

import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small businesses just getting started.",
    features: [
      "1,000 Messages / month",
      "1 Agent",
      "Basic Support",
      "Standard Response Time"
    ],
    current: false,
    buttonText: "Downgrade"
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "Ideal for growing teams with higher volume needs.",
    features: [
      "10,000 Messages / month",
      "5 Agents",
      "Priority Support",
      "Advanced Analytics",
      "Custom System Prompts"
    ],
    current: true,
    buttonText: "Current Plan"
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For large scale operations requiring maximum power.",
    features: [
      "Unlimited Messages",
      "Unlimited Agents",
      "24/7 Dedicated Support",
      "SLA Guarantee",
      "Custom Model Fine-tuning"
    ],
    current: false,
    buttonText: "Upgrade"
  }
];

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription & Billing</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your plan and billing details.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
              plan.current
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            {plan.current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                Current Plan
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {plan.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {plan.description}
              </p>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-indigo-600" />
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                plan.current
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700"
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold mb-4">Billing History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {[
                { id: "INV-001", date: "Oct 1, 2023", amount: "$79.00", status: "Paid" },
                { id: "INV-002", date: "Sep 1, 2023", amount: "$79.00", status: "Paid" },
                { id: "INV-003", date: "Aug 1, 2023", amount: "$29.00", status: "Paid" },
              ].map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-3 font-medium">{invoice.id}</td>
                  <td className="py-3 text-zinc-500 dark:text-zinc-400">{invoice.date}</td>
                  <td className="py-3 text-zinc-500 dark:text-zinc-400">{invoice.amount}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
