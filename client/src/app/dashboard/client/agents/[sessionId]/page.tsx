"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, Brain, CheckCheck, Globe, KeyRound, Loader2, MoreVertical,
  Paperclip, Power, QrCode, Save, Search, Send, Settings2, Shield, Smile,
  Smartphone, Sparkles, Trash2, Workflow, Zap
} from "lucide-react";
import api from "@/lib/api";

type ProviderId = "openai" | "claude" | "gemini" | "deepseek" | "openai_compatible";
type TabId = "overview" | "agent" | "chats";

type ChatItem = { id: string; name: string; lastMessage: string; time: string; unreadCount: number; status: string };
type MessageItem = { id: string; text: string; sender: "me" | "them"; time: string; status: string };
type MemoryItem = { id: string; question: string; answer: string; created_at: string };
type DocumentItem = { id: string; file_name: string; file_url: string; file_type: string; created_at: string };
type AgentConfig = {
  isEnabled: boolean;
  agentName: string;
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  excludedNumbers: string;
};
type SessionData = {
  id: string;
  phoneNumber: string;
  contact: string;
  status: string;
  lastActive: string;
  messageCount: number;
  platform: string;
  device: string;
  batteryLevel: number;
  agentId: string | null;
  config: AgentConfig;
};

const providers = [
  { id: "openai" as ProviderId, name: "OpenAI", icon: Sparkles, model: "openai", supportsBaseUrl: false, desc: "Use OpenAI or platform default key." },
  { id: "claude" as ProviderId, name: "Claude", icon: Brain, model: "claude-3-5-sonnet-latest", supportsBaseUrl: true, desc: "Anthropic models." },
  { id: "gemini" as ProviderId, name: "Gemini", icon: Zap, model: "gemini-2.5-flash", supportsBaseUrl: true, desc: "Google Gemini models." },
  { id: "deepseek" as ProviderId, name: "DeepSeek", icon: Workflow, model: "deepseek-chat", supportsBaseUrl: true, desc: "DeepSeek via compatible API." },
  { id: "openai_compatible" as ProviderId, name: "OpenAI Compatible", icon: Globe, model: "custom-model", supportsBaseUrl: true, desc: "Any custom compatible endpoint." },
];

const emptyConfig: AgentConfig = {
  isEnabled: false,
  agentName: "",
  provider: "openai",
  model: "openai",
  apiKey: "",
  baseUrl: "",
  systemPrompt: "",
  excludedNumbers: "",
};

const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><div className="mb-4 flex items-center gap-2">{icon}<h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3></div>{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-1"><span className="text-sm text-zinc-500">{label}</span><span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</span></div>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50"><div className="mb-1 text-xs text-zinc-500">{label}</div><div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>{children}</div>;
}

export default function SessionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const bottomRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [session, setSession] = useState<SessionData>({
    id: sessionId,
    phoneNumber: "Loading...",
    contact: "",
    status: "unknown",
    lastActive: "-",
    messageCount: 0,
    platform: "WhatsApp",
    device: "-",
    batteryLevel: 0,
    agentId: null,
    config: emptyConfig,
  });
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [excludedInput, setExcludedInput] = useState("");
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memoryQuestion, setMemoryQuestion] = useState("");
  const [memoryAnswer, setMemoryAnswer] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [useCustomProvider, setUseCustomProvider] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const provider = useMemo(() => providers.find((item) => item.id === session.config.provider) || providers[0], [session.config.provider]);

  useEffect(() => {
    void loadSession();
    void loadChats();
    const timer = setInterval(() => void loadChats(), 10000);
    return () => clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");
    socket.on("connect", () => socket.emit("join_session", sessionId));
    socket.on("qr", (data) => {
      if (data.sessionId === sessionId && data.qr) setQrCode(data.qr);
    });
    socket.on("status", (data) => {
      if (data.sessionId !== sessionId) return;
      setSession((prev) => ({ ...prev, status: data.status }));
      if (data.status === "open" || data.status === "active") {
        setQrCode(null);
        setShowConnect(false);
        void loadSession();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (selectedChatId) void loadMessages(selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const raw = window.localStorage.getItem("waas:selectedPromptTemplate");
    if (!raw) return;

    try {
      const selected = JSON.parse(raw) as { sessionId: string; prompt: string };
      if (selected.sessionId === sessionId && selected.prompt) {
        patchConfig("systemPrompt", selected.prompt);
        toast.success("Sample prompt applied");
      }
    } catch (error) {
      console.error("Failed to load selected prompt template", error);
    } finally {
      window.localStorage.removeItem("waas:selectedPromptTemplate");
    }
  }, [sessionId]);

  async function loadSession() {
    try {
      setIsLoading(true);
      const res = await api.get(`/sessions/${sessionId}`);
      const s = res.data.session;
      if (s.qr) setQrCode(s.qr);
      let config: AgentConfig = {
        ...emptyConfig,
        isEnabled: s.ai_enabled === 1 || s.ai_enabled === true,
        agentName: `Agent for ${s.phone_number || s.id.slice(0, 8)}`,
      };
      if (s.agent_id) {
        try {
          const agentRes = await api.get(`/agents/${s.agent_id}`);
          const a = agentRes.data.agent;
          const hasCustomProvider = Boolean(a.api_key || a.base_url || (a.provider && a.provider !== "openai"));
          config = {
            ...config,
            agentName: a.name || config.agentName,
            provider: (a.provider || "openai") as ProviderId,
            model: a.model || config.model,
            apiKey: a.api_key || "",
            baseUrl: a.base_url || "",
            systemPrompt: a.system_prompt || "",
            excludedNumbers: a.excluded_numbers || "",
          };
          setMemoryItems(agentRes.data.memory || []);
          setDocuments(agentRes.data.documents || []);
          setUseCustomProvider(hasCustomProvider);
        } catch (error) {
          console.error("Failed to fetch agent details", error);
        }
      } else {
        setUseCustomProvider(false);
        setMemoryItems([]);
        setDocuments([]);
      }
      setSession({
        id: s.id,
        phoneNumber: s.phone_number || "-",
        contact: s.contact_name || "",
        status: s.status,
        lastActive: s.last_active ? new Date(s.last_active).toLocaleString(undefined, { timeZone: "Asia/Karachi" }) : "-",
        messageCount: Number(s.messageCount || 0),
        platform: s.platform || "WhatsApp",
        device: s.device || "-",
        batteryLevel: Number(s.batteryLevel || s.battery_level || 0),
        agentId: s.agent_id || null,
        config,
      });
    } catch (error) {
      console.error("Failed to fetch session", error);
      toast.error("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadChats() {
    try {
      const res = await api.get(`/sessions/${sessionId}/chats`);
      setChats(res.data.chats || []);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    }
  }

  async function loadMessages(chatId: string) {
    try {
      const res = await api.get(`/sessions/${sessionId}/chats/${chatId}/messages`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  }

  function patchConfig<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setSession((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  }

  function getExcludedItems() {
    return session.config.excludedNumbers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function addExcludedItem() {
    const value = excludedInput.trim();
    if (!value) return;
    const items = getExcludedItems();
    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      toast.error("This contact or group is already excluded");
      return;
    }
    patchConfig("excludedNumbers", [...items, value].join(","));
    setExcludedInput("");
  }

  function removeExcludedItem(value: string) {
    const items = getExcludedItems().filter((item) => item !== value);
    patchConfig("excludedNumbers", items.join(","));
  }

  function chooseProvider(id: ProviderId) {
    const next = providers.find((item) => item.id === id);
    if (!next) return;
    setSession((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        provider: id,
        model: next.model,
        baseUrl:
          id === "openai" ? "" :
          id === "deepseek" ? (prev.config.baseUrl || "https://api.deepseek.com") :
          id === "claude" ? (prev.config.baseUrl || "https://api.anthropic.com") :
          id === "gemini" ? (prev.config.baseUrl || "https://generativelanguage.googleapis.com") :
          prev.config.baseUrl,
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      let agentId = session.agentId;
      const providerId = useCustomProvider ? session.config.provider : "openai";
      const providerModel =
        useCustomProvider
          ? session.config.model
          : (providers.find((item) => item.id === "openai")?.model || "openai");
      const payload = {
        name: session.config.agentName || `Agent for ${session.phoneNumber || session.id.slice(0, 8)}`,
        provider: providerId,
        model: providerModel,
        api_key: useCustomProvider ? (session.config.apiKey || "") : "",
        base_url: useCustomProvider ? (session.config.baseUrl || "") : "",
        system_prompt: session.config.systemPrompt,
        excluded_numbers: session.config.excludedNumbers || "",
        webhook_url: "",
      };
      if (agentId) await api.patch(`/agents/${agentId}`, payload);
      else {
        const res = await api.post("/agents", payload);
        agentId = res.data.id;
      }
      await api.patch(`/sessions/${sessionId}`, { agent_id: agentId, ai_enabled: session.config.isEnabled });
      setSession((prev) => ({ ...prev, agentId: agentId || null }));
      await loadSession();
      toast.success("Session settings saved");
    } catch (error) {
      console.error("Failed to save", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  async function ensureAgentId() {
    if (session.agentId) return session.agentId;
    const res = await api.post("/agents", {
      name: session.config.agentName || `Agent for ${session.phoneNumber || session.id.slice(0, 8)}`,
      provider: useCustomProvider ? session.config.provider : "openai",
      model: useCustomProvider ? session.config.model : (providers.find((item) => item.id === "openai")?.model || "openai"),
      api_key: useCustomProvider ? (session.config.apiKey || "") : "",
      base_url: useCustomProvider ? (session.config.baseUrl || "") : "",
      system_prompt: session.config.systemPrompt,
      excluded_numbers: session.config.excludedNumbers || "",
      webhook_url: "",
    });
    const agentId = res.data.id;
    await api.patch(`/sessions/${sessionId}`, { agent_id: agentId });
    setSession((prev) => ({ ...prev, agentId }));
    return agentId;
  }

  async function addMemoryItem() {
    const question = memoryQuestion.trim();
    const answer = memoryAnswer.trim();
    if (!question || !answer) {
      toast.error("Question and answer are required");
      return;
    }
    try {
      const agentId = await ensureAgentId();
      await api.post(`/agents/${agentId}/memory`, { question, answer });
      setMemoryQuestion("");
      setMemoryAnswer("");
      const res = await api.get(`/agents/${agentId}`);
      setMemoryItems(res.data.memory || []);
      toast.success("Memory added");
    } catch (error) {
      console.error("Failed to add memory", error);
      toast.error("Failed to add memory");
    }
  }

  async function deleteMemoryItem(memoryId: string) {
    try {
      const agentId = await ensureAgentId();
      await api.delete(`/agents/${agentId}/memory/${memoryId}`);
      setMemoryItems((prev) => prev.filter((item) => item.id !== memoryId));
      toast.success("Memory removed");
    } catch (error) {
      console.error("Failed to delete memory", error);
      toast.error("Failed to delete memory");
    }
  }

  async function uploadDocument(file: File | null) {
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      const agentId = await ensureAgentId();
      const formData = new FormData();
      formData.append("document", file);
      await api.post(`/agents/${agentId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = await api.get(`/agents/${agentId}`);
      setDocuments(res.data.documents || []);
      toast.success("Document uploaded");
    } catch (error) {
      console.error("Failed to upload document", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  }

  async function deleteDocument(documentId: string) {
    try {
      const agentId = await ensureAgentId();
      await api.delete(`/agents/${agentId}/documents/${documentId}`);
      setDocuments((prev) => prev.filter((item) => item.id !== documentId));
      toast.success("Document removed");
    } catch (error) {
      console.error("Failed to delete document", error);
      toast.error("Failed to delete document");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/sessions/${sessionId}`);
      router.push("/dashboard/client/agents");
    } catch (error) {
      console.error("Failed to delete session", error);
      toast.error("Failed to delete session");
      setIsDeleting(false);
    }
  }

  async function handleLogout() {
    if (!confirm("Are you sure you want to log out of this WhatsApp session? You will need to scan the QR code again to reconnect.")) return;
    setIsLoggingOut(true);
    try {
      await api.post(`/sessions/${sessionId}/logout`);
      await loadSession();
      toast.success("Logged out successfully", { position: "top-center" });
    } catch (error) {
      console.error("Failed to logout session", error);
      toast.error("Failed to logout session", { position: "top-center" });
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!messageInput.trim() || !selectedChatId) return;
    const text = messageInput;
    setMessageInput("");
    try {
      const res = await api.post(`/sessions/${sessionId}/chats/${encodeURIComponent(selectedChatId)}/messages`, { text });
      if (res.data.ok && res.data.message) {
        setMessages((prev) => [...prev, res.data.message]);
        void loadChats();
      }
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Failed to send message");
      setMessageInput(text);
    }
  }

  function uptime(input: string) {
    if (!input || input === "-") return "-";
    const start = new Date(input);
    const diff = Date.now() - start.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  }

  const selectedChat = chats.find((item) => item.id === selectedChatId) || null;
  const excludedItems = getExcludedItems();
  const isDisconnected = session.status === "init";
  const isWaitingForScan = session.status === "connecting" && !session.phoneNumber;
  const showQrView = showConnect || isWaitingForScan;

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  if (isDisconnected || showQrView) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!showQrView ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20"><Smartphone className="h-8 w-8 text-orange-600 dark:text-orange-400" /></div>
              <h2 className="mb-2 text-2xl font-bold">WhatsApp Disconnected</h2>
              <p className="mb-8 text-zinc-500 dark:text-zinc-400">This session is currently logged out. Connect your WhatsApp account to resume service.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowConnect(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"><QrCode className="h-5 w-5" />Connect WhatsApp</button>
                <button onClick={() => router.push("/dashboard/client/agents")} className="w-full rounded-xl bg-zinc-100 px-4 py-3 font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Go Back</button>
                <button onClick={handleDelete} disabled={isDeleting} className="w-full rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">{isDeleting ? "Deleting..." : "Delete Session"}</button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 text-left">
                <button onClick={() => (isWaitingForScan ? router.push("/dashboard/client/agents") : setShowConnect(false))} className="mb-4 flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ArrowLeft className="h-4 w-4" />Back</button>
                <h2 className="text-xl font-bold">Scan QR Code</h2>
                <p className="text-sm text-zinc-500">Open WhatsApp on your phone and scan the code.</p>
              </div>
              <div className="mb-6 inline-block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">{qrCode ? <QRCodeSVG value={qrCode} size={240} /> : <div className="flex h-[240px] w-[240px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>}</div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-800/50"><Shield className="h-4 w-4 text-green-500" /><span>End-to-end encrypted connection</span></div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-none border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft className="h-5 w-5 text-zinc-500" /></button>
            <div><h1 className="text-2xl font-bold tracking-tight">Session Details</h1><p className="text-zinc-500 dark:text-zinc-400">{session.phoneNumber}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-900/30 dark:bg-orange-900/10 dark:text-orange-400">{isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}{isLoggingOut ? "Logging out..." : "Logout"}</button>
            <button onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{isDeleting ? "Deleting..." : "Delete Session"}</button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{isSaving ? "Saving..." : "Save Changes"}{!isSaving && <Save className="h-4 w-4" />}</button>
          </div>
        </div>
        <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800">
          {(["overview", "agent", "chats"] as TabId[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`relative pb-3 text-sm font-medium ${activeTab === tab ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}>
              {tab === "overview" ? "Overview" : tab === "agent" ? "Agent Configuration" : "AI Chats"}
              {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                  <Card title="Connection Status">
                    <InfoRow label="Status" value={session.status} />
                    <InfoRow label="Number" value={session.phoneNumber} />
                    <InfoRow label="Contact" value={session.contact || "-"} />
                    <InfoRow label="Platform" value={session.platform} />
                    <InfoRow label="Device" value={session.device || "-"} />
                    <InfoRow label="Last Active" value={session.lastActive} />
                  </Card>
                  <Card title="Agent Summary">
                    <InfoRow label="AI" value={session.config.isEnabled ? "Enabled" : "Disabled"} />
                    <InfoRow label="Provider" value={useCustomProvider ? provider.name : "Built-in AI Agent"} />
                    <InfoRow label="Model" value={useCustomProvider ? (session.config.model || "-") : "Managed by platform"} />
                  </Card>
                </div>
                <div className="space-y-6 lg:col-span-2">
                  <Card title="Session Activity">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <StatBox label="Messages" value={String(session.messageCount)} />
                      <StatBox label="Uptime" value={session.status === "active" ? uptime(session.lastActive) : "-"} />
                      <StatBox label="Battery" value={`${session.batteryLevel || 0}%`} />
                    </div>
                  </Card>
                  <Card title="Quick Notes" icon={<Settings2 className="h-5 w-5 text-indigo-600" />}>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Use the Agent Configuration tab to define prompts, provider settings, model, base URL, and custom API credentials.</p>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "agent" && (
            <motion.div key="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                  <Card title="Enable Agent">
                    <div className="flex items-center justify-between">
                      <div><div className="font-medium text-zinc-900 dark:text-zinc-100">Auto Replies</div><p className="text-sm text-zinc-500">Enable AI replies for this session.</p></div>
                      <button onClick={() => patchConfig("isEnabled", !session.config.isEnabled)} className={`relative inline-flex h-7 w-12 items-center rounded-full ${session.config.isEnabled ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${session.config.isEnabled ? "translate-x-6" : "translate-x-1"}`} /></button>
                    </div>
                  </Card>
                  <Card title="Current Provider" icon={<Bot className="h-5 w-5 text-indigo-600" />}>
                    <div className="space-y-4">
                      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                        <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{useCustomProvider ? provider.name : "Built-in AI Agent"}</div>
                        <p className="text-xs text-zinc-500">
                          {useCustomProvider ? provider.desc : "This session will use the platform-managed AI setup unless you enable a custom provider."}
                        </p>
                      </div>
                      <button
                        onClick={() => setUseCustomProvider((prev) => !prev)}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          useCustomProvider
                            ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {useCustomProvider ? "Use Built-in AI Agent" : "Custom Provider"}
                      </button>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6 lg:col-span-2">
                  <Card title="Agent Configuration" icon={<Bot className="h-5 w-5 text-indigo-600" />}>
                    <Field label="Agent Name"><input value={session.config.agentName} onChange={(e) => patchConfig("agentName", e.target.value)} className={inputCls} placeholder="Support Agent" /></Field>
                    {useCustomProvider ? (
                      <>
                        <Field label="Provider">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {providers.map((item) => (
                              <button key={item.id} onClick={() => chooseProvider(item.id)} className={`rounded-xl border p-4 text-left ${session.config.provider === item.id ? "border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"}`}>
                                <item.icon className={`mb-3 h-5 w-5 ${session.config.provider === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500"}`} />
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.name}</div>
                                <div className="mt-1 text-xs text-zinc-500">{item.desc}</div>
                              </button>
                            ))}
                          </div>
                        </Field>
                        <div className="grid gap-6 md:grid-cols-2">
                          <Field label="Model"><input value={session.config.model} onChange={(e) => patchConfig("model", e.target.value)} className={inputCls} placeholder="openai" /></Field>
                          <Field label="Custom API Key"><div className="relative"><KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><input type="password" value={session.config.apiKey} onChange={(e) => patchConfig("apiKey", e.target.value)} className={`${inputCls} pl-10`} placeholder="Optional custom key" /></div></Field>
                        </div>
                        {provider.supportsBaseUrl && <Field label="Base URL"><input value={session.config.baseUrl} onChange={(e) => patchConfig("baseUrl", e.target.value)} className={inputCls} placeholder="https://api.example.com" /></Field>}
                      </>
                    ) : (
                      <div></div>
                    )}
                    <Field label="AI Agent Sample Prompt Gallery">
                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                        <div>
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Browse ready-made prompts</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Open a dedicated gallery page for Customer Support, Sales, Business Details, and more.</div>
                        </div>
                        <Link
                          href={`/dashboard/client/agents/prompts?sessionId=${sessionId}`}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Open Gallery
                        </Link>
                      </div>
                    </Field>
                    <Field label="System Prompt"><textarea value={session.config.systemPrompt} onChange={(e) => patchConfig("systemPrompt", e.target.value)} rows={8} className={inputCls} placeholder="You are a helpful support assistant..." /></Field>
                    <Field label="Excluded Contacts & Groups">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <input
                            value={excludedInput}
                            onChange={(e) => setExcludedInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addExcludedItem();
                              }
                            }}
                            className={inputCls}
                            placeholder="Enter one number or group name"
                          />
                          <button
                            type="button"
                            onClick={addExcludedItem}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {excludedItems.length > 0 ? (
                            excludedItems.map((item) => (
                              <div
                                key={item}
                                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/50"
                              >
                                <span className="text-sm text-zinc-800 dark:text-zinc-200">{item}</span>
                                <button
                                  type="button"
                                  onClick={() => removeExcludedItem(item)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                              No excluded contacts or groups added yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </Field>
                    <Field label="Agent Memory: Custom Question & Answer">
                      <div className="space-y-4">
                        <input value={memoryQuestion} onChange={(e) => setMemoryQuestion(e.target.value)} className={inputCls} placeholder="Question, e.g. What are your office hours?" />
                        <textarea value={memoryAnswer} onChange={(e) => setMemoryAnswer(e.target.value)} rows={4} className={inputCls} placeholder="Answer the agent should use..." />
                        <button type="button" onClick={addMemoryItem} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                          Add Memory
                        </button>
                        <div className="space-y-2">
                          {memoryItems.length > 0 ? memoryItems.map((item) => (
                            <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.question}</div>
                              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.answer}</div>
                              <button type="button" onClick={() => deleteMemoryItem(item.id)} className="mt-3 text-sm font-medium text-red-600 hover:text-red-700">
                                Remove
                              </button>
                            </div>
                          )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                              No custom Q&A memory added yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </Field>
                    <Field label="Agent Documents">
                      <div className="space-y-4">
                        <input
                          type="file"
                          onChange={(e) => void uploadDocument(e.target.files?.[0] || null)}
                          className={`${inputCls} file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700`}
                        />
                        {isUploadingDoc && <div className="text-sm text-zinc-500">Uploading document...</div>}
                        <div className="space-y-2">
                          {documents.length > 0 ? documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                              <div>
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{doc.file_name}</div>
                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                                  View document
                                </a>
                              </div>
                              <button type="button" onClick={() => deleteDocument(doc.id)} className="text-sm font-medium text-red-600 hover:text-red-700">
                                Remove
                              </button>
                            </div>
                          )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                              No documents uploaded yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </Field>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full">
              <div className="flex w-96 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input placeholder="Search or start new chat" className="w-full rounded-lg bg-zinc-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-zinc-200" /></div></div>
                <div className="flex-1 overflow-y-auto">
                  {chats.map((chat) => (
                    <div key={chat.id} onClick={() => setSelectedChatId(chat.id)} className={`cursor-pointer p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${selectedChatId === chat.id ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">{(chat.name || chat.id).charAt(0)}</div>
                        <div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between"><h4 className="truncate font-medium text-zinc-900 dark:text-zinc-100">{chat.name || chat.id}</h4><span className="text-xs text-zinc-500">{new Date(chat.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="flex items-center justify-between"><p className="truncate text-sm text-zinc-500">{chat.lastMessage}</p>{chat.unreadCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-medium text-white">{chat.unreadCount}</span>}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a]">
                {selectedChatId ? (
                  <>
                    <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">{selectedChat?.name?.charAt(0) || "?"}</div><div><h3 className="font-medium text-zinc-900 dark:text-zinc-100">{selectedChat?.name || selectedChatId}</h3><p className="text-xs text-zinc-500">{selectedChat?.status === "online" ? "online" : "last seen recently"}</p></div></div>
                      <div className="flex items-center gap-4 text-zinc-500"><Search className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" /><MoreVertical className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" /></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundRepeat: "repeat", backgroundSize: "400px" }}>
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div key={message.id} className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${message.sender === "me" ? "rounded-tr-none bg-[#d9fdd3] text-zinc-900 dark:bg-[#005c4b] dark:text-zinc-100" : "rounded-tl-none bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"}`}>
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <div className="mt-1 flex items-center justify-end gap-1"><span className="text-[10px] text-zinc-500 dark:text-zinc-400">{new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>{message.sender === "me" && <span className={message.status === "read" ? "text-blue-500" : "text-zinc-400"}><CheckCheck className="h-3 w-3" /></span>}</div>
                            </div>
                          </div>
                        ))}
                        <div ref={bottomRef} />
                      </div>
                    </div>
                    <div className="flex-none border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"><form onSubmit={handleSendMessage} className="flex items-center gap-3"><button type="button" className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"><Smile className="h-6 w-6" /></button><button type="button" className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"><Paperclip className="h-5 w-5" /></button><input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Type a message" className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /><button type="submit" className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700"><Send className="h-5 w-5" /></button></form></div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 p-8 text-center text-zinc-500 dark:bg-zinc-900/50"><div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"><Smartphone className="h-10 w-10 text-zinc-400" /></div><h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp Web</h3><p className="max-w-md">Select a chat from the sidebar to view the conversation history and AI responses.</p></div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
