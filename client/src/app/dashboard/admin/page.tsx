"use client";

import React, { useEffect, useState } from "react";
import { Users, CreditCard, DollarSign, Activity, TrendingUp, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    active_subscriptions: 0,
    monthly_revenue: 0,
    server_status: "Checking..."
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users') // We'll slice top 5 on client side for now as backend returns all
        ]);
        
        setStats(statsRes.data);
        setRecentUsers(usersRes.data.users.slice(0, 5));
      } catch (e) {
        console.error("Failed to fetch admin dashboard data", e);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    {
      name: "Total Users",
      value: stats.total_users.toLocaleString(),
      change: "+12%", // Mock trend for now
      trend: "up",
      icon: Users,
    },
    {
      name: "Active Subscriptions",
      value: stats.active_subscriptions.toLocaleString(),
      change: "+8%",
      trend: "up",
      icon: CreditCard,
    },
    {
      name: "Monthly Revenue",
      value: `Rs ${stats.monthly_revenue.toLocaleString()}`,
      change: "+23%",
      trend: "up",
      icon: DollarSign,
    },
    {
      name: "Server Status",
      value: stats.server_status,
      change: "Stable",
      trend: "neutral",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-zinc-500">Welcome back, here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="flex items-center font-medium text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                {stat.change}
              </span>
              <span className="text-zinc-500">from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold">Recent Registrations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
                {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <span className="font-semibold text-xs text-zinc-500">
                                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{user.name || "No Name"}</p>
                                <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
           <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold">System Health</h3>
          </div>
           <div className="p-6 space-y-4">
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                      <span>CPU Usage</span>
                      <span className="font-medium">45%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[45%] bg-indigo-500 rounded-full" />
                  </div>
              </div>
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                      <span>Memory Usage</span>
                      <span className="font-medium">62%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[62%] bg-violet-500 rounded-full" />
                  </div>
              </div>
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                      <span>Storage</span>
                      <span className="font-medium">28%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[28%] bg-pink-500 rounded-full" />
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
