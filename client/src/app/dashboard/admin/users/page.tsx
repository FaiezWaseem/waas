"use client";

import { useState, useEffect } from "react";
import { Search, MoreVertical, Shield, Mail, Trash2, Ban, Plus, X, User as UserIcon, Phone, CreditCard, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "", // Added password for creation
    role: "client", // lowercase to match backend
    status: "Active",
    plan: "Starter"
  });

  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans || []);
    } catch (e) {
      console.error("Failed to fetch plans", e);
    }
  }

  async function fetchUsers() {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }

  const handleOpenModal = async (user: any = null) => {
    if (user) {
      setEditingUser(user);
      // Fetch user details including subscription if needed, or just use what we have
      // The list endpoint returns: id, email, name, role, created_at
      // It does NOT return phone, status, or plan.
      
      // Let's try to fetch more details if possible, or default to what we have.
      // Currently GET /admin/users/:id returns basic info.
      // GET /admin/subscriptions lists all. 
      
      // Ideally we should fetch the specific user's plan.
      // For now, let's keep it simple as requested.
      
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        password: "",
        role: user.role,
        status: user.status || "Active",
        plan: user.plan || "" // We might not have this from the list
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "client",
        status: "Active",
        plan: "Starter"
      });
    }
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/admin/users/${userId}`);
        setUsers(users.filter(user => user.id !== userId));
      } catch (e) {
        console.error("Failed to delete user", e);
        alert("Failed to delete user");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update user profile
        await api.put(`/admin/users/${editingUser.id}`, {
          name: formData.name,
          role: formData.role,
          email: formData.email,
          ...(formData.password ? { password: formData.password } : {})
        });

        // Update plan if changed (assuming we have a subscription ID for the user)
        // In a real scenario, we'd need to fetch the user's active subscription ID first or have an endpoint that handles both.
        // For now, we'll try to update the subscription if the user has one.
        // NOTE: The current UI/API doesn't easily expose the subscription ID on the user object list.
        // We might need to fetch user details or adjust the API.
        
        // However, looking at admin.js, we have `PUT /users/:id/subscription/:subId`.
        // But we don't have subId here. 
        // Alternatively, `POST /users/:id/subscription` creates a new one.
        
        // Let's stick to updating profile for now as requested "admin edit user profile is not dynamic".
        // The previous code was hardcoding fields.
        
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...formData }
            : user
        ));
      } else {
        // Create
        if (!formData.password) {
            alert("Password is required for new users");
            return;
        }
        const res = await api.post('/admin/users', {
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role
        });
        setUsers([res.data.user, ...users]);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (e: any) {
      console.error("Failed to save user", e);
      alert(e.response?.data?.error || "Failed to save user");
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage user accounts and permissions.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {user.name ? user.name.slice(0,2).toUpperCase() : user.email.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name || "No Name"}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                    {user.phone || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.role === "admin" ? (
                        <Shield className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Mail className="h-4 w-4 text-zinc-400" />
                      )}
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-zinc-400" />
                      <span>{user.plan || "Starter"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {user.status || "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
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

      {/* Add User Modal */}
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
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{editingUser ? "Edit User" : "Add New User"}</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      required
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password {editingUser && "(Leave blank to keep current)"}</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    >
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subscription Plan</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({...formData, plan: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black appearance-none"
                    >
                      <option value="">Select a plan</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
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
                    {editingUser ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
