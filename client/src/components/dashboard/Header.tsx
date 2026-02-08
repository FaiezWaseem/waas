"use client";

import React from "react";
import { Menu, Bell } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 shadow-sm lg:hidden">
      <button
        onClick={onMenuClick}
        className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-2 font-bold text-xl">
        <span className="text-zinc-900 dark:text-zinc-100">WaaS</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <button className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
