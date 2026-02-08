"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { 
  ArrowLeft, 
  Save, 
  Phone, 
  MessageSquare, 
  Clock, 
  Power, 
  Shield, 
  Trash2, 
  Smartphone,
  Bot,
  Sparkles,
  Zap,
  Brain,
  History,
  AlertTriangle,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  Send,
  Mic,
  User,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const models = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Most capable model for complex tasks",
    icon: Sparkles
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and cost-effective",
    icon: Zap
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Excel at reasoning and coding",
    icon: Brain
  }
];

// Mock Chat Data
const mockContacts = [
  { id: "1", name: "Alice Smith", lastMessage: "Hey, can you help me with my order?", time: "10:30 AM", unreadCount: 2, status: "online" },
  { id: "2", name: "Bob Johnson", lastMessage: "Thanks for the info!", time: "Yesterday", unreadCount: 0, status: "offline" },
  { id: "3", name: "Marketing Group", lastMessage: "Meeting at 3 PM", time: "Yesterday", unreadCount: 5, status: "online" },
  { id: "4", name: "Sarah Wilson", lastMessage: "Is the pricing negotiable?", time: "Tue", unreadCount: 0, status: "online" },
  { id: "5", name: "Tech Support", lastMessage: "Your ticket #1234 has been resolved", time: "Mon", unreadCount: 0, status: "offline" },
];

const mockMessages: Record<string, any[]> = {
  "1": [
    { id: "1", text: "Hi there! I'm interested in your premium plan.", sender: "them", time: "10:25 AM", status: "read" },
    { id: "2", text: "Hello! I'd be happy to help you with that. What specific features are you looking for?", sender: "me", time: "10:26 AM", status: "read" },
    { id: "3", text: "I need API access and priority support.", sender: "them", time: "10:28 AM", status: "read" },
    { id: "4", text: "Our Premium plan includes both! It starts at $99/month.", sender: "me", time: "10:29 AM", status: "delivered" },
    { id: "5", text: "Hey, can you help me with my order?", sender: "them", time: "10:30 AM", status: "sent" },
  ],
  "2": [
    { id: "1", text: "Thanks for the info!", sender: "them", time: "Yesterday", status: "read" }
  ]
};

interface SessionConfig {
  isEnabled: boolean;
  excludedNumbers: string;
  model: string;
  systemPrompt: string;
}

interface SessionData {
  id: string;
  phoneNumber: string;
  status: string;
  lastActive: string;
  messageCount: number;
  platform: string;
  device: string;
  batteryLevel: number;
  agent_id: string | null;
  config: SessionConfig;
}

export default function SessionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'chats'>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session Data
  const [session, setSession] = useState<SessionData>({
    id: sessionId,
    phoneNumber: "Loading...",
    status: "unknown",
    lastActive: "-",
    messageCount: 0,
    platform: "WhatsApp",
    device: "-",
    batteryLevel: 0,
    agent_id: null,
    config: {
      isEnabled: true,
      excludedNumbers: "",
      model: "gpt-3.5-turbo",
      systemPrompt: ""
    }
  });

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/sessions/${sessionId}`);
      const s = res.data.session;
      
      let agentConfig = {
        model: "gpt-3.5-turbo",
        systemPrompt: ""
      };

      if (s.agent_id) {
         try {
           const aRes = await api.get(`/agents/${s.agent_id}`);
           const a = aRes.data.agent;
           agentConfig = {
             model: a.model || "gpt-3.5-turbo",
             systemPrompt: a.system_prompt || ""
           };
         } catch (err) {
           console.error("Failed to fetch agent details", err);
         }
      }

      setSession({
        ...session,
        id: s.id,
        status: s.status,
        phoneNumber: s.id.slice(0, 12), // Placeholder using ID
        lastActive: new Date(s.created_at).toLocaleString(), // Placeholder using created_at
        agent_id: s.agent_id,
        config: {
          ...session.config,
          ...agentConfig
        }
      });
    } catch (e) {
      console.error("Failed to fetch session", e);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChatId, mockMessages]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (session.agent_id) {
        await api.patch(`/agents/${session.agent_id}`, {
          model: session.config.model,
          system_prompt: session.config.systemPrompt
        });
        // refresh data
        await fetchSessionData();
      }
    } catch (e) {
      console.error("Failed to save", e);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await api.delete(`/sessions/${sessionId}`);
        router.push('/dashboard/client/agents');
      } catch (e) {
        console.error("Failed to delete session", e);
        alert("Failed to delete session");
        setIsDeleting(false);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChatId) return;
    
    // In a real app, you would send this to the backend
    // For now, just clear the input
    setMessageInput("");
  };

  const selectedContact = mockContacts.find(c => c.id === selectedChatId);
  const currentMessages = selectedChatId ? (mockMessages[selectedChatId] || []) : [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Session Details</h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                {session.phoneNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeleting ? "Deleting..." : "Delete Session"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
              {!isSaving && <Save className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === 'overview' 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Overview & Configuration
            {activeTab === 'overview' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" 
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === 'chats' 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            AI Chats
            {activeTab === 'chats' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" 
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-zinc-50 dark:bg-black/20">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-3">
                {/* Left Column: Status & Info */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Status Card */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Connection Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Status</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          session.status === "active" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            session.status === "active" ? "bg-green-500" : "bg-zinc-400"
                          }`} />
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Device</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{session.device}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Battery</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{session.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Last Active</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{session.lastActive}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Card */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Session Activity</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-2 text-zinc-500 mb-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs">Messages</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{session.messageCount}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-2 text-zinc-500 mb-1">
                          <History className="h-4 w-4" />
                          <span className="text-xs">Uptime</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">3d 12h</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Configuration */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Main Toggle */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Enable Agent</h3>
                        <p className="text-sm text-zinc-500">Allow the AI agent to automatically reply to incoming messages for this session.</p>
                      </div>
                      <button
                        onClick={() => setSession(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, isEnabled: !prev.config.isEnabled } 
                        }))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          session.config.isEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                            session.config.isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* AI Configuration */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-6 flex items-center gap-2">
                      <Bot className="h-5 w-5 text-indigo-600" />
                      <h2 className="font-semibold">AI Configuration</h2>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          AI Model
                        </label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => setSession(prev => ({
                                ...prev,
                                config: { ...prev.config, model: model.id }
                              }))}
                              className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                                session.config.model === model.id
                                  ? "border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                              }`}
                            >
                              <model.icon className={`h-5 w-5 ${
                                session.config.model === model.id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
                              }`} />
                              <div>
                                <div className={`text-sm font-medium ${
                                  session.config.model === model.id ? "text-indigo-900 dark:text-indigo-100" : "text-zinc-900 dark:text-zinc-100"
                                }`}>
                                  {model.name}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {model.provider}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          System Prompt
                        </label>
                        <div className="relative">
                          <textarea
                            value={session.config.systemPrompt}
                            onChange={(e) => setSession(prev => ({
                              ...prev,
                              config: { ...prev.config, systemPrompt: e.target.value }
                            }))}
                            rows={6}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="Define how the AI should behave..."
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-zinc-400">
                            {session.config.systemPrompt.length} chars
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          This prompt defines the personality and behavior of your AI agent.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Exclusions */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-600" />
                      Privacy & Exclusions
                    </h3>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Excluded Contacts & Groups</label>
                      <p className="text-xs text-zinc-500">
                        The agent will completely ignore messages from these numbers or group names.
                      </p>
                      <textarea
                        value={session.config.excludedNumbers}
                        onChange={(e) => setSession(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, excludedNumbers: e.target.value } 
                        }))}
                        className="h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 transition-all"
                        placeholder="e.g. +1234567890, Family Group, Team Chat..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex"
            >
              {/* Sidebar - Contacts List */}
              <div className="w-96 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                      type="text"
                      placeholder="Search or start new chat"
                      className="w-full rounded-lg bg-zinc-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mockContacts.map((contact) => (
                    <div 
                      key={contact.id}
                      onClick={() => setSelectedChatId(contact.id)}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                        selectedChatId === contact.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-medium dark:bg-indigo-900/30 dark:text-indigo-400">
                          {contact.name.charAt(0)}
                        </div>
                        {contact.status === 'online' && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium truncate text-zinc-900 dark:text-zinc-100">{contact.name}</h4>
                          <span className={`text-xs ${
                            contact.unreadCount > 0 ? 'text-green-600 font-medium' : 'text-zinc-500'
                          }`}>
                            {contact.time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-zinc-500 truncate">{contact.lastMessage}</p>
                          {contact.unreadCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-medium text-white">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a]">
                {selectedChatId ? (
                  <>
                    {/* Chat Header */}
                    <div className="flex-none px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium dark:bg-indigo-900/30 dark:text-indigo-400">
                          {selectedContact?.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{selectedContact?.name}</h3>
                          <p className="text-xs text-zinc-500">
                            {selectedContact?.status === 'online' ? 'online' : 'last seen recently'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-zinc-500">
                        <Search className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
                        <MoreVertical className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div 
                      className="flex-1 overflow-y-auto p-4 space-y-4"
                      style={{
                        backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                        backgroundRepeat: "repeat",
                        backgroundSize: "400px"
                      }}
                    >
                      {currentMessages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative ${
                              msg.sender === 'me' 
                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 rounded-tr-none' 
                                : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {msg.time}
                              </span>
                              {msg.sender === 'me' && (
                                <span className={msg.status === 'read' ? 'text-blue-500' : 'text-zinc-400'}>
                                  <CheckCheck className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex-none px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <button type="button" className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400">
                          <Smile className="h-6 w-6" />
                        </button>
                        <button type="button" className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400">
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message"
                          className="flex-1 rounded-lg bg-white px-4 py-2 text-sm outline-none border border-zinc-200 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                        />
                        {messageInput.trim() ? (
                          <button 
                            type="submit"
                            className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        ) : (
                          <button type="button" className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400">
                            <Mic className="h-6 w-6" />
                          </button>
                        )}
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="h-24 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                      <Smartphone className="h-10 w-10 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      WhatsApp Web
                    </h3>
                    <p className="max-w-md">
                      Select a chat from the sidebar to view the conversation history and AI responses.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
