"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownRight, Plus, Edit2, Trash2, Check, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // Plan Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    currency: "Rs",
    billingCycle: "Monthly",
    description: "",
    features: "",
    max_sessions: "1",
    max_agents: "1",
    max_messages: "1000",
    max_chats: "1000",
    active: true
  });

  // Subscription Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [subFormData, setSubFormData] = useState({
    user_id: "",
    plan_id: "",
    status: "active",
    billingCycle: "Monthly"
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [plansRes, subsRes, usersRes, statsRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/subscriptions'),
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);

      setPlans(plansRes.data.plans.map((p: any) => ({
        ...p,
        price: p.price_monthly,
        features: p.features ? p.features.split('\n') : [],
        active: true // default for now
      })));
      
      setSubs(subsRes.data.subscriptions.map((s: any) => ({
        ...s,
        user: s.user_name || s.user_email || 'Unknown',
        plan: s.plan_name || 'Unknown',
        amount: `Rs ${s.amount || 0}`,
        status: s.status || 'active', // default
        nextBilling: s.period_end ? new Date(s.period_end).toLocaleDateString() : 'N/A'
      })));

      setUsers(usersRes.data.users);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  }

  const handleOpenModal = (plan: any = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price.toString(),
        currency: "Rs",
        billingCycle: "Monthly",
        description: plan.description || "",
        features: plan.features.join("\n"),
        max_sessions: plan.max_sessions?.toString() || "1",
        max_agents: plan.max_agents?.toString() || "1",
        max_messages: plan.max_messages?.toString() || "1000",
        max_chats: plan.max_chats?.toString() || "1000",
        active: plan.active
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        price: "",
        currency: "Rs",
        billingCycle: "Monthly",
        description: "",
        features: "",
        max_sessions: "1",
        max_agents: "1",
        max_messages: "1000",
        max_chats: "1000",
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenSubModal = (sub: any = null) => {
    if (sub) {
      setEditingSub(sub);
      // find plan id by name if needed, but sub should have plan_id if fetched from backend
      // Wait, the fetched sub has plan_name, but maybe not plan_id in the map above?
      // I should preserve plan_id in the map.
      // The backend query returns s.id, s.status, ... p.name. It might not return p.id as plan_id?
      // Check admin.js query: SELECT s.id ... s.plan_id is implied? No, query is explicit.
      // Query: SELECT s.id, ... p.name ... FROM subscriptions s ...
      // I should check if s.plan_id is selected.
      // admin.js line 32: SELECT s.id, s.status, s.period_start, s.period_end, u.name..., p.name...
      // It does NOT select s.plan_id or s.user_id. I should fix the backend query to include ids.
      // For now, I'll assume I'll fix the backend query.
      setSubFormData({
        user_id: sub.user_id || "", // I need to fetch this
        plan_id: sub.plan_id || "", // I need to fetch this
        status: sub.status,
        billingCycle: "Monthly"
      });
    } else {
      setEditingSub(null);
      setSubFormData({
        user_id: "",
        plan_id: plans[0]?.id || "",
        status: "active",
        billingCycle: "Monthly"
      });
    }
    setIsSubModalOpen(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      try {
        await api.delete(`/admin/plans/${planId}`);
        fetchData();
      } catch (e) {
        console.error(e);
        alert("Failed to delete plan");
      }
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      try {
        await api.delete(`/admin/subscriptions/${subId}`);
        fetchData();
      } catch (e) {
        console.error(e);
        alert("Failed to delete subscription");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      price_monthly: Number(formData.price),
      description: formData.description,
      features: formData.features,
      max_sessions: Number(formData.max_sessions),
      max_agents: Number(formData.max_agents),
      max_messages: Number(formData.max_messages),
      max_chats: Number(formData.max_chats)
    };

    try {
      if (editingPlan) {
        await api.put(`/admin/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/admin/plans', payload);
      }
      fetchData();
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save plan");
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSub) {
        await api.put(`/admin/subscriptions/${editingSub.id}`, {
          status: subFormData.status,
          plan_id: subFormData.plan_id,
          // Update period if needed, but for now just status/plan
          period_start: editingSub.period_start,
          period_end: editingSub.period_end
        });
      } else {
        // Create subscription
        await api.post(`/admin/users/${subFormData.user_id}/subscription`, {
          planId: subFormData.plan_id
        });
      }
      fetchData();
      setIsSubModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save subscription");
    }
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
              { label: "Total Revenue", value: `Rs ${stats.monthly_revenue || 0}`, change: "+0%", trend: "up" },
              { label: "Active Subscriptions", value: stats.active_subscriptions || 0, change: "+0%", trend: "up" },
              { label: "Total Users", value: stats.total_users || 0, change: "+0%", trend: "up" },
              { label: "Server Status", value: stats.server_status || "Stable", change: "", trend: "up" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">{sub.id.substring(0,8)}...</td>
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
                            sub.status === "active"
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
                  {subs.length === 0 && (
                     <tr>
                       <td colSpan={7} className="px-6 py-4 text-center text-zinc-500">No subscriptions found</td>
                     </tr>
                  )}
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
                      Rs {plan.price}
                    </span>
                    <span className="text-sm text-zinc-500">/mo</span>
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
              
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 h-10 line-clamp-2">{plan.description}</p>
              
              <div className="mt-6 space-y-3">
                {plan.features.slice(0,4).map((feature:string, i:number) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                 <div>Sessions: {plan.max_sessions}</div>
                 <div>Agents: {plan.max_agents}</div>
                 <div>Messages: {plan.max_messages}</div>
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
              <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
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
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price (Monthly)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-medium">Max Sessions</label>
                       <input type="number" value={formData.max_sessions} onChange={e=>setFormData({...formData, max_sessions: e.target.value})} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium">Max Agents</label>
                       <input type="number" value={formData.max_agents} onChange={e=>setFormData({...formData, max_agents: e.target.value})} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium">Max Messages</label>
                       <input type="number" value={formData.max_messages} onChange={e=>setFormData({...formData, max_messages: e.target.value})} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium">Max Chats</label>
                       <input type="number" value={formData.max_chats} onChange={e=>setFormData({...formData, max_chats: e.target.value})} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Features (one per line)</label>
                    <textarea
                      value={formData.features}
                      onChange={(e) => setFormData({...formData, features: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {editingPlan ? "Save Changes" : "Create Plan"}
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
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
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
                    <label className="text-sm font-medium">User</label>
                    <select
                      disabled={!!editingSub}
                      required
                      value={subFormData.user_id}
                      onChange={(e) => setSubFormData({...subFormData, user_id: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                    >
                      <option value="">Select User</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan</label>
                    <select
                      required
                      value={subFormData.plan_id}
                      onChange={(e) => setSubFormData({...subFormData, plan_id: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                    >
                      <option value="">Select Plan</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                      ))}
                    </select>
                  </div>

                  {editingSub && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={subFormData.status}
                        onChange={(e) => setSubFormData({...subFormData, status: e.target.value})}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:bg-black dark:border-zinc-700"
                      >
                         <option value="active">Active</option>
                         <option value="past_due">Past Due</option>
                         <option value="canceled">Canceled</option>
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsSubModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {editingSub ? "Save Changes" : "Create Subscription"}
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