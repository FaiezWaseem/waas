"use client";

import { useState } from "react";
import { Search, MoreVertical, MessageSquare, Clock, User } from "lucide-react";

const chats = [
  {
    id: 1,
    customer: "Alice Smith",
    phone: "+1 (555) 123-4567",
    lastMessage: "I need help with my subscription plan.",
    timestamp: "2 mins ago",
    status: "active",
    platform: "WhatsApp"
  },
  {
    id: 2,
    customer: "Bob Johnson",
    phone: "+1 (555) 987-6543",
    lastMessage: "Thanks for the quick response!",
    timestamp: "1 hour ago",
    status: "closed",
    platform: "Telegram"
  },
  {
    id: 3,
    customer: "Carol White",
    phone: "+1 (555) 456-7890",
    lastMessage: "Is there an API documentation available?",
    timestamp: "3 hours ago",
    status: "active",
    platform: "WhatsApp"
  },
  {
    id: 4,
    customer: "David Brown",
    phone: "+1 (555) 789-0123",
    lastMessage: "How do I change my payment method?",
    timestamp: "1 day ago",
    status: "closed",
    platform: "WhatsApp"
  },
  {
    id: 5,
    customer: "Eva Green",
    phone: "+1 (555) 321-6549",
    lastMessage: "The bot is not responding correctly.",
    timestamp: "2 days ago",
    status: "active",
    platform: "Telegram"
  }
];

export default function ChatsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Chats</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Monitor and review conversations between your agents and customers.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-black"
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{chat.customer}</h3>
                    <span className="text-xs text-zinc-500">{chat.phone}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        chat.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {chat.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {chat.timestamp}
                </div>
                <div className="hidden sm:block rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800">
                  {chat.platform}
                </div>
                <button className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
