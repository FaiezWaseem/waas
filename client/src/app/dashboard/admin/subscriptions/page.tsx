"use client";

import { useState } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownRight, Plus, Edit2, Trash2, Check, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data
const initialSubscriptions = [
  {
    id: "SUB-1234",
    user: "John Doe",
    plan: "Pro",
    amount: "$79.00",
    status: "Active",
    billingCycle: "Monthly",
    nextBilling: "Nov 12, 2023"
  },
  {
    id: "SUB-5678",
    user: "Jane Smith",
    plan: "Starter",
    amount: "$29.00",
    status: "Active",
    billingCycle: "Monthly",
    nextBilling: "Nov 10, 2023"
  },
  {
    id: "SUB-9012",
    user: "Robert Fox",
    plan: "Enterprise",
    amount: "$199.00",
    status: "Past Due",
    billingCycle: "Monthly",
    nextBilling: "Nov 05, 2023"
  }
];

const initialPlans = [
  {
    id: "plan_1",
    name: "Starter",
    price: 29,
    currency: "$",
    billingCycle: "Monthly",
    description: "Perfect for individuals and small projects",
    features: ["Up to 5 Projects", "Basic Analytics", "Community Support", "1GB Storage"],
    active: true
  },
  {
    id: "plan_2",
    name: "Pro",
    price: 79,
    currency: "$",
    billingCycle: "Monthly",
    description: "For growing businesses and teams",
    features: ["Unlimited Projects", "Advanced Analytics", "Priority Support", "10GB Storage", "Custom Domains"],
    active: true
  },
  {
    id: "plan_3",
    name: "Enterprise",
    price: 199,
    currency: "$",
    billingCycle: "Monthly",
    description: "Maximum power and control",
    features: ["Unlimited Everything", "Custom Solutions", "24/7 Phone Support", "Unlimited Storage", "SLA"],
    active: true
  }
];

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [plans, setPlans] = useState(initialPlans);
  const [subs, setSubs] = useState(initialSubscriptions);
  
  // Plan Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    currency: "$",
    billingCycle: "Monthly",
    description: "",
    features: "",
    active: true
  });

  // Subscription Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [subFormData, setSubFormData] = useState({
    user: "",
    plan: "Starter",
    status: "Active",
    billingCycle: "Monthly"
  });

  const handleOpenModal = (plan: any = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price.toString(),
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        description: plan.description,
        features: plan.features.join("\n"),
        active: plan.active
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        price: "",
        currency: "$",
        billingCycle: "Monthly",
        description: "",
        features: "",
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenSubModal = (sub: any = null) => {
    if (sub) {
      setEditingSub(sub);
      setSubFormData({
        user: sub.user,
        plan: sub.plan,
        status: sub.status,
        billingCycle: sub.billingCycle
      });
    } else {
      setEditingSub(null);
      setSubFormData({
        user: "",
        plan: "Starter",
        status: "Active",
        billingCycle: "Monthly"
      });
    }
    setIsSubModalOpen(true);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      setPlans(plans.filter(p => p.id !== planId));
    }
  };

  const handleDeleteSub = (subId: string) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      setSubs(subs.filter(s => s.id !== subId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresList = formData.features.split("\n").filter(f => f.trim() !== "");
    
    if (editingPlan) {
      setPlans(plans.map(p => 
        p.id === editingPlan.id 
          ? { ...p, ...formData, price: Number(formData.price), features: featuresList }
          : p
      ));
    } else {
      const newPlan = {
        id: `plan_${Date.now()}`,
        ...formData,
        price: Number(formData.price),
        features: featuresList
      };
      setPlans([...plans, newPlan]);
    }
    setIsModalOpen(false);
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planDetails = plans.find(p => p.name === subFormData.plan) || plans[0];
    const amount = `$${planDetails.price}.00`;
    
    if (editingSub) {
      setSubs(subs.map(s => 
        s.id === editingSub.id 
          ? { 
              ...s, 
              ...subFormData,
              amount,
            }
          : s
      ));
    } else {
      const newSub = {
        id: `SUB-${Math.floor(Math.random() * 10000)}`,
        ...subFormData,
        amount,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      };
      setSubs([...subs, newSub]);
    }
    setIsSubModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions & Plans</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage user subscriptions and configure pricing plans.
          </p>
        </div>
        {activeTab === "plans" ? (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </button>
        ) : (
          <button 
            onClick={() => handleOpenSubModal()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Subscription
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === "subscriptions"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            User Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === "plans"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            Pricing Plans
          </button>
        </nav>
      </div>

      {activeTab === "subscriptions" ? (
        <>
          {/* Stats Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Revenue", value: "$12,450", change: "+12.5%", trend: "up" },
              { label: "Active Subscriptions", value: "854", change: "+4.2%", trend: "up" },
              { label: "Churn Rate", value: "2.4%", change: "-0.5%", trend: "down" },
              { label: "ARPU", value: "$48.00", change: "+1.2%", trend: "up" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className={`flex items-center text-sm font-medium ${
                    (stat.trend === "up" && stat.label !== "Churn Rate") || (stat.trend === "down" && stat.label === "Churn Rate")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                />
              </div>
              <button className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Next Billing</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {subs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">{sub.id}</td>
                      <td className="px-6 py-4 font-medium">{sub.user}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">{sub.amount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            sub.status === "Active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                        {sub.nextBilling}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenSubModal(sub)}
                            className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSub(sub.id)}
                            className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="text-sm text-zinc-500">/{plan.billingCycle === "Monthly" ? "mo" : "yr"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(plan)}
                    className="p-2 text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 h-10">{plan.description}</p>
              
              <div className="mt-6 space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  plan.active 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {plan.active ? "Active Plan" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => handleOpenModal()}
            className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-zinc-500 transition-colors hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-900/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Create New Plan</h3>
              <p className="text-sm mt-1">Add a new pricing tier</p>
            </div>
          </button>
        </div>
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">{editingPlan ? "Edit Plan" : "Create New Plan"}</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Plan Name</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Pro Plan"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{formData.currency}</span>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="29.00"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Billing Cycle</label>
                      <select
                        value={formData.billingCycle}
                        onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={formData.active ? "true" : "false"}
                        onChange={(e) => setFormData({...formData, active: e.target.value === "true"})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <input
                      type="text"
                      placeholder="Brief description of the plan"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Features (one per line)</label>
                    <textarea
                      rows={5}
                      placeholder="Unlimited Projects&#10;Advanced Analytics&#10;Priority Support"
                      value={formData.features}
                      onChange={(e) => setFormData({...formData, features: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black resize-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {editingPlan ? "Update Plan" : "Create Plan"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Subscription Modal */}
      <AnimatePresence>
        {isSubModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">{editingSub ? "Edit Subscription" : "Add Subscription"}</h2>
                  <button 
                    onClick={() => setIsSubModalOpen(false)}
                    className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">User Name</label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={subFormData.user}
                      onChange={(e) => setSubFormData({...subFormData, user: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan</label>
                    <select
                      value={subFormData.plan}
                      onChange={(e) => setSubFormData({...subFormData, plan: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    >
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.name}>{plan.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={subFormData.status}
                        onChange={(e) => setSubFormData({...subFormData, status: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                      >
                        <option value="Active">Active</option>
                        <option value="Past Due">Past Due</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Billing Cycle</label>
                      <select
                        value={subFormData.billingCycle}
                        onChange={(e) => setSubFormData({...subFormData, billingCycle: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsSubModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {editingSub ? "Update Subscription" : "Add Subscription"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
