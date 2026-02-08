import Link from "next/link";
import { ArrowRight, LayoutDashboard, Shield } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Select Dashboard</h1>
        <p className="text-zinc-500">For demonstration purposes, please select a role.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Link 
          href="/dashboard/client"
          className="group relative flex h-40 w-64 flex-col items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md"
        >
          <div className="mb-4 rounded-full bg-indigo-50 p-3 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <h3 className="font-semibold">Client Dashboard</h3>
          <span className="absolute bottom-4 opacity-0 transition-opacity group-hover:opacity-100">
             <ArrowRight className="h-4 w-4 text-indigo-500" />
          </span>
        </Link>

        <Link 
          href="/dashboard/admin"
          className="group relative flex h-40 w-64 flex-col items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:border-red-500 hover:shadow-md"
        >
          <div className="mb-4 rounded-full bg-red-50 p-3 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <Shield className="h-8 w-8" />
          </div>
          <h3 className="font-semibold">Admin Dashboard</h3>
           <span className="absolute bottom-4 opacity-0 transition-opacity group-hover:opacity-100">
             <ArrowRight className="h-4 w-4 text-red-500" />
          </span>
        </Link>
      </div>
    </div>
  );
}
