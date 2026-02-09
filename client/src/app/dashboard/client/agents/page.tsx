"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Phone, Activity, QrCode, Loader2, Bot } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";





export default function AgentsPage() {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleOpenConnectPage = () => {
    router.push('/dashboard/client/agents/connect');
  };

  return (
    <div className="space-y-6">


      {/* Active Sessions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">Active Sessions</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Current active WhatsApp connections with your AI agent.
            </p>
          </div>
          <button
            onClick={handleOpenConnectPage}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <QrCode className="h-4 w-4" />
            Connect New Number
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-zinc-500">
              <p>No active sessions found.</p>
              <button
                onClick={handleOpenConnectPage}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Connect your first number
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-50/50 text-zinc-500 dark:bg-zinc-800/50">
                  <th className="px-6 py-3 font-medium">Session ID / Agent</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">AI Status</th>
                  <th className="px-6 py-3 font-medium">Created At</th>
                  <th className="px-6 py-3 font-medium">Platform</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span >{session.agent_name || "No Agent"}</span>
                          <span className="text-xs text-zinc-500" >{session.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${session.status === "open"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${session.status === "open"  ? "bg-green-500" : "bg-zinc-400"
                          }`} />
                        {(session.status || "unknown")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        session.ai_enabled !== 0
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        <Bot className="h-3 w-3" />
                        {session.ai_enabled !== 0 ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(session.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      WhatsApp
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/client/agents/${session.id}`)}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
