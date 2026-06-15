"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import api from "@/lib/api";

interface Chat {
  id: string;
  customer: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  status: string;
  platform: string;
  sessionId: string;
  sessionName: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await api.get('/client/chats');
      setChats(res.data.chats);
    } catch (e) {
      console.error("Failed to fetch chats", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.phone.includes(searchTerm) ||
    chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {loading ? (
             <div className="p-8 text-center text-zinc-500">Loading chats...</div>
          ) : filteredChats.length === 0 ? (
             <div className="p-8 text-center text-zinc-500">No chats found</div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/dashboard/client/agents/${chat.sessionId}?tab=chats&chatId=${encodeURIComponent(chat.phone)}@s.whatsapp.net`)}
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
                        {chat.platform}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-1">{chat.lastMessage}</p>
                    <p className="text-xs text-zinc-400 mt-1">via {chat.sessionName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">{timeAgo(chat.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
