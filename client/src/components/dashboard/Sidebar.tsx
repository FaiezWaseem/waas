"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  MessageSquare,
  LogOut,
  X,
  Bot,
  BookOpen,
  Code2,
  Megaphone,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  role: "admin" | "client";
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarUser {
  name: string;
  email: string;
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SidebarUser>({
    name: role === "admin" ? "Admin User" : "User",
    email: "",
  });

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (isMounted) {
            setUser({
              name: parsedUser.name || parsedUser.email || "User",
              email: parsedUser.email || "",
            });
          }
        } catch (error) {
          console.error("Failed to parse stored user", error);
        }
      }

      try {
        const res = await api.get("/me");
        if (!isMounted || !res.data?.user) return;

        const nextUser = {
          name: res.data.user.name || res.data.user.email || "User",
          email: res.data.user.email || "",
        };

        setUser(nextUser);

        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            localStorage.setItem("user", JSON.stringify({ ...parsedUser, ...nextUser }));
          } catch {
            localStorage.setItem("user", JSON.stringify(nextUser));
          }
        } else {
          localStorage.setItem("user", JSON.stringify(nextUser));
        }
      } catch (error) {
        console.error("Failed to fetch current user", error);
      }
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, [role]);

  const initialsSource = user.name || user.email || (role === "admin" ? "Admin" : "User");
  const initials = initialsSource
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }

  const adminLinks = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/dashboard/admin/payment-methods", label: "Payment Methods", icon: CreditCard },
    { href: "/dashboard/admin/blogs", label: "Blogs", icon: BookOpen },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
  ];

  const clientLinks = [
    { href: "/dashboard/client", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/client/agents", label: "Sessions", icon: Bot },
    { href: "/dashboard/client/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/dashboard/client/templates", label: "Templates", icon: FileText },
    { href: "/dashboard/client/chats", label: "Chats", icon: MessageSquare },
    { href: "/dashboard/client/developers", label: "Developers", icon: Code2 },
    { href: "/dashboard/client/subscription", label: "Upgrade Plans", icon: CreditCard },
    { href: "/dashboard/client/settings", label: "Settings", icon: Settings },
  ];

  const links = role === "admin" ? adminLinks : clientLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 lg:static lg:block lg:!transform-none"
        )}
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        variants={{
           open: { x: 0 },
           closed: { x: "-100%" }
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
             <div className="flex items-center gap-2 font-bold text-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white">W</div>
                <span>WaaS</span>
             </div>
             <button onClick={onClose} className="ml-auto lg:hidden text-zinc-500">
                <X className="h-6 w-6" />
             </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4">
             <nav className="space-y-1">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
             </nav>
          </div>

          {/* User Profile / Footer */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
             <div className="mb-3">
                <ThemeToggle className="w-full justify-center" />
             </div>
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <span className="font-semibold text-sm">
                        {initials}
                    </span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {user.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                        {user.email}
                    </p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                    <LogOut className="h-5 w-5" />
                </button>
             </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
