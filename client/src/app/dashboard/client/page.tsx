import React from "react";
import { MessageSquare, Zap, FileText, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ClientDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500">Manage your WhatsApp campaigns and messages.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-indigo-50 dark:bg-indigo-900/20 p-3 text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Messages Sent</p>
              <h4 className="text-2xl font-bold">1,024</h4>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-50 dark:bg-amber-900/20 p-3 text-amber-600 dark:text-amber-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Credits Remaining</p>
              <h4 className="text-2xl font-bold">450</h4>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 p-3 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Active Templates</p>
              <h4 className="text-2xl font-bold">12</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
           <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold">Recent Messages</h3>
            <Link href="/dashboard/client/messages" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="p-0">
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500">
                         <tr>
                             <th className="px-6 py-3 font-medium">To</th>
                             <th className="px-6 py-3 font-medium">Template</th>
                             <th className="px-6 py-3 font-medium">Status</th>
                             <th className="px-6 py-3 font-medium">Time</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                         {[1, 2, 3, 4, 5].map((i) => (
                             <tr key={i} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                 <td className="px-6 py-4 font-medium">+1 (555) 000-000{i}</td>
                                 <td className="px-6 py-4 text-zinc-500">welcome_message_v{i}</td>
                                 <td className="px-6 py-4">
                                     <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Delivered</span>
                                 </td>
                                 <td className="px-6 py-4 text-zinc-500">2m ago</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
        </div>

        <div className="space-y-4">
             <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
                <h3 className="font-bold text-lg">Quick Send</h3>
                <p className="text-indigo-100 text-sm mt-1 mb-4">Send a message to a contact immediately.</p>
                <button className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                    New Message
                </button>
             </div>

             <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                    <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <span className="text-sm font-medium">Create Template</span>
                        <Plus className="h-4 w-4 text-zinc-400" />
                    </button>
                    <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <span className="text-sm font-medium">Top Up Credits</span>
                        <Plus className="h-4 w-4 text-zinc-400" />
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}
