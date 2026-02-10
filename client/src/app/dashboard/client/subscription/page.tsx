"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_sessions: number;
  max_agents: number;
  max_messages: number;
  max_chats: number;
  description: string;
  features: string; // JSON string or comma-separated
}

interface Subscription {
  id: string;
  plan_id: string;
  period_start: string;
  period_end: string;
  status: string;
}

interface Invoice {
  id: string;
  period_start: string;
  amount: number;
  status: string;
}

interface PaymentMethod {
  id: string;
  title: string;
  type: 'bank' | 'wallet' | 'other';
  details: string;
  instructions: string;
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subRes, invRes, methodsRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/me'),
        api.get('/subscriptions/invoices'),
        api.get('/payment-methods')
      ]);

      setPlans(plansRes.data.plans);
      setSubscription(subRes.data.subscription);
      setInvoices(invRes.data.invoices || []);
      setPaymentMethods(methodsRes.data.paymentMethods || []);
    } catch (e) {
      console.error("Failed to fetch subscription data", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAction = (plan: Plan) => {
    if (subscription?.plan_id === plan.id) return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const parseFeatures = (features: string) => {
    if (!features) return [];
    try {
      return JSON.parse(features);
    } catch {
      return features.split(',').map(f => f.trim());
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading subscription details...</div>;
  }

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
        {plans.map((plan) => {
          const isCurrent = subscription?.plan_id === plan.id;
          const featuresList = parseFeatures(plan.features);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                isCurrent
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Current Plan
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">Rs {plan.price_monthly}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    /month
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-6 flex-1 space-y-3">
                <li className="flex items-center gap-2 text-sm">
                   <Check className="h-4 w-4 text-indigo-600" />
                   <span className="text-zinc-600 dark:text-zinc-300">{plan.max_messages} Messages / mo</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                   <Check className="h-4 w-4 text-indigo-600" />
                   <span className="text-zinc-600 dark:text-zinc-300">{plan.max_agents} Agents</span>
                </li>
                 <li className="flex items-center gap-2 text-sm">
                   <Check className="h-4 w-4 text-indigo-600" />
                   <span className="text-zinc-600 dark:text-zinc-300">{plan.max_sessions} Sessions</span>
                </li>
                {featuresList.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-indigo-600" />
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanAction(plan)}
                disabled={isCurrent}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCurrent
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 opacity-50 cursor-default"
                    : "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700"
                }`}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
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
              {invoices.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="py-4 text-center text-zinc-500">No invoices found</td>
                 </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-3 font-medium">{invoice.id.slice(0, 8)}...</td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400">{new Date(invoice.period_start).toLocaleDateString()}</td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400">Rs {invoice.amount}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {invoice.status || 'Paid'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Upgrade to {selectedPlan.name}</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6 space-y-4">
              <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium">Total Amount</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">Rs {selectedPlan.price_monthly}</p>
              </div>

              <div className="space-y-4">
                <p className="font-medium text-sm text-zinc-500 uppercase tracking-wider">Payment Options</p>
                
                <div className="space-y-3">
                  {paymentMethods.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm border border-dashed border-zinc-300 rounded-lg">
                      No payment methods available. Please contact admin.
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div key={method.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <p className="font-semibold text-sm">{method.title}</p>
                        <p className="text-sm text-zinc-500 whitespace-pre-wrap font-mono mt-1">{method.details}</p>
                        {method.instructions && (
                           <p className="text-xs text-zinc-400 mt-1 italic">{method.instructions}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg mt-4">
                <p className="text-sm font-medium mb-2">Instructions:</p>
                <ol className="list-decimal list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <li>Send the exact amount to one of the accounts above.</li>
                  <li>Take a screenshot of the successful transaction.</li>
                  <li>Send the screenshot to Admin on WhatsApp:</li>
                </ol>
                <p className="mt-2 font-mono font-bold text-center text-lg text-green-600 dark:text-green-400 select-all">
                  {process.env.NEXT_PUBLIC_SUPPORT_PHONE}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
