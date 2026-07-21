"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  BookOpen,
  Rocket,
  MessageSquareText,
  Megaphone,
  Layers3,
  Bot,
  Webhook,
  Smartphone,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

async function buildDeveloperApiMarkdown(baseUrl: string): Promise<string> {
  const res = await fetch(`/docs/for-ai/developer-api.md`);
  if (!res.ok) {
    throw new Error("Failed to load developer API docs");
  }
  let body = (await res.text()).trim();
  // Inject the live base URL so the copied doc matches this environment
  body = body.replaceAll("{BACKEND}", baseUrl || "http://localhost:4000");
  return body + "\n";
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
  display: string;
}

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  has_secret: boolean;
  created_at: string;
}

function CodeBlock({
  code,
  onCopy,
}: {
  code: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <button
        onClick={() => onCopy(code)}
        className="absolute right-3 top-3 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition hover:bg-zinc-800"
      >
        <Copy className="h-4 w-4" />
      </button>
      <pre className="overflow-x-auto p-5 pr-16 text-sm leading-6 text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; name: string; key: string } | null>(null);
  const [keyName, setKeyName] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [origin, setOrigin] = useState("");
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([
    "message.incoming",
    "message.outgoing",
    "session.status",
    "session.qr",
  ]);
  const [hookUrl, setHookUrl] = useState("");
  const [hookSecret, setHookSecret] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["message.incoming"]);
  const [creatingHook, setCreatingHook] = useState(false);
  const [copyingForAi, setCopyingForAi] = useState(false);
  const [copiedForAi, setCopiedForAi] = useState(false);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    setOrigin(backendUrl);
    fetchKeys();
    fetchSessions();
    fetchWebhooks();
  }, []);

  const sampleSessionId = sessions[0]?.id || "SESSION_ID";

  const snippets = useMemo(() => {
    return {
      listSessions: `curl -X GET ${origin}/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      createSession: `curl -X POST ${origin}/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "AGENT_ID",
    "ai_enabled": true
  }'`,
      getSession: `curl -X GET ${origin}/v1/sessions/${sampleSessionId} \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      updateSessionAi: `curl -X PATCH ${origin}/v1/sessions/${sampleSessionId}/ai \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ai_enabled": true,
    "agent_id": "AGENT_ID",
    "system_prompt": "You are a helpful WhatsApp support agent.",
    "provider": "openai",
    "model": "gpt-4o-mini"
  }'`,
      createAgent: `curl -X POST ${origin}/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Support Bot",
    "system_prompt": "You are a friendly support agent.",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "human_handoff_phone": "+1234567890"
  }'`,
      patchAgent: `curl -X PATCH ${origin}/v1/agents/AGENT_ID \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "system_prompt": "Updated prompt",
    "ai_enabled note": "use session AI endpoint to toggle ai_enabled",
    "excluded_numbers": "1234567890,0987654321"
  }'`,
      bindAgent: `curl -X POST ${origin}/v1/agents/AGENT_ID/bind-session \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sampleSessionId}",
    "ai_enabled": true
  }'`,
      createWebhook: `curl -X POST ${origin}/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhooks/waas",
    "secret": "whsec_your_shared_secret",
    "events": ["message.incoming", "session.status", "session.qr"]
  }'`,
      webhookPayload: `{
  "event": "message.incoming",
  "delivery_id": "uuid",
  "timestamp": "2026-07-21T12:00:00.000Z",
  "data": {
    "message_id": "...",
    "session_id": "...",
    "agent_id": "...",
    "ai_enabled": true,
    "from": "923001112233@s.whatsapp.net",
    "from_phone": "923001112233",
    "text": "Hello",
    "direction": "in"
  }
}`,
      sendText: `curl -X POST ${origin}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sampleSessionId}",
    "to": "+1234567890",
    "text": "Hello from API!"
  }'`,
      sendTemplate: `curl -X POST ${origin}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sampleSessionId}",
    "to": "+1234567890",
    "template_id": "TEMPLATE_ID",
    "variables": {
      "Name": "Ali",
      "Date": "12 Apr 2026"
    }
  }'`,
      sendMedia: `curl -X POST ${origin}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sampleSessionId}",
    "to": "+1234567890",
    "type": "image",
    "url": "https://example.com/image.png",
    "caption": "Check this out!"
  }'`,
      createCampaign: `curl -X POST ${origin}/v1/campaigns \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "April Outreach",
    "session_id": "${sampleSessionId}",
    "message_template": "Assalamualaikum {{name}}, we would love to share details about our software solution.",
    "contacts": [
      {
        "name": "Ali Khan",
        "phone": "+923001112233",
        "email": "ali@example.com"
      },
      {
        "name": "Sara Ahmed",
        "phone": "+923112223344",
        "email": "sara@example.com"
      }
    ]
  }'`,
      listCampaigns: `curl -X GET ${origin}/v1/campaigns \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      getCampaign: `curl -X GET ${origin}/v1/campaigns/CAMPAIGN_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      updateCampaign: `curl -X PATCH ${origin}/v1/campaigns/CAMPAIGN_ID \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "ready"
  }'`,
      addCampaignContacts: `curl -X POST ${origin}/v1/campaigns/CAMPAIGN_ID/contacts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      {
        "name": "Usman Tariq",
        "phone": "+923224445566",
        "email": "usman@example.com"
      }
    ]
  }'`,
    };
  }, [origin, sampleSessionId]);

  const fetchKeys = async () => {
    try {
      const res = await api.get("/api-keys");
      setKeys(res.data.keys);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get("/sessions");
      setSessions(res.data.sessions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await api.get("/webhooks");
      setHooks(res.data.webhooks || []);
      if (res.data.supported_events?.length) setSupportedEvents(res.data.supported_events);
    } catch (e) {
      console.error(e);
    }
  };

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingHook(true);
    try {
      await api.post("/webhooks", {
        url: hookUrl,
        secret: hookSecret || undefined,
        events: hookEvents,
      });
      setHookUrl("");
      setHookSecret("");
      setHookEvents(["message.incoming"]);
      await fetchWebhooks();
      toast.success("Webhook created");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create webhook");
    } finally {
      setCreatingHook(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await api.delete(`/webhooks/${id}`);
      setHooks((prev) => prev.filter((h) => h.id !== id));
      toast.success("Webhook deleted");
    } catch (_e) {
      toast.error("Failed to delete webhook");
    }
  };

  const testWebhook = async (id: string) => {
    try {
      await api.post(`/webhooks/${id}/test`);
      toast.success("Test event dispatched");
    } catch (_e) {
      toast.error("Failed to send test event");
    }
  };

  const toggleHookEvent = (event: string) => {
    setHookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/api-keys", { name: keyName });
      setNewKey(res.data);
      setKeyName("");
      setIsCreating(false);
      fetchKeys();
      toast.success("API key created");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to create key");
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys(keys.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } catch (e) {
      toast.error("Failed to delete key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const copyForAi = async () => {
    setCopyingForAi(true);
    try {
      const markdown = await buildDeveloperApiMarkdown(origin);
      await navigator.clipboard.writeText(markdown);

      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "waas-developer-api.md";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setCopiedForAi(true);
      toast.success("Developer API markdown copied + downloaded");
      window.setTimeout(() => setCopiedForAi(false), 2500);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load developer API docs");
    } finally {
      setCopyingForAi(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-indigo-50 p-8 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-300">
              <BookOpen className="h-3.5 w-3.5" />
              Developer Docs
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Build with the WaaS API</h1>
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
              Create API keys, connect WhatsApp sessions, update AI settings, receive real-time inbound webhooks, send messages, and run campaigns from your own apps.
            </p>
            <button
              type="button"
              onClick={copyForAi}
              disabled={copyingForAi}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
            >
              {copyingForAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : copiedForAi ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {copyingForAi ? "Preparing…" : copiedForAi ? "Copied!" : "Copy For AI"}
            </button>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Copies only the <strong>Developer API</strong> reference (sessions, AI, webhooks, messages, campaigns) for AI tools, and downloads <code>waas-developer-api.md</code>.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Base URL</div>
              <div className="mt-1 break-all text-zinc-500 dark:text-zinc-400">{origin || "http://localhost:4000"}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Auth</div>
              <div className="mt-1 text-zinc-500 dark:text-zinc-400">Bearer API key</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Campaign Pace</div>
              <div className="mt-1 text-zinc-500 dark:text-zinc-400">Scheduler-controlled</div>
            </div>
          </div>
        </div>
      </div>

      <DocCard
        icon={Key}
        title="1. API Keys"
        description="Create and manage API keys for your apps, integrations, and automation scripts."
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Use these keys to authenticate requests to the developer API. Keep them secret and rotate them if exposed.
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Key
          </button>
        </div>

        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/40">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">API key created successfully</h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      This is the only time the full key is shown. Copy it now and store it safely.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 rounded-xl border border-green-200 bg-white px-3 py-2 font-mono text-sm text-zinc-800 dark:border-green-900 dark:bg-black dark:text-zinc-300">
                        {newKey.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newKey.key)}
                        className="rounded-lg p-2 transition hover:bg-green-200 dark:hover:bg-green-800"
                      >
                        <Copy className="h-4 w-4 text-green-700 dark:text-green-400" />
                      </button>
                    </div>
                    <button onClick={() => setNewKey(null)} className="mt-4 text-sm font-medium text-green-700 underline dark:text-green-400">
                      I have saved it
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreating && !newKey && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={createKey}
              className="mb-6 flex items-end gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Key Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production App"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  Create
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-zinc-500">Loading keys...</div>
          ) : keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 py-8 text-center text-zinc-500 dark:border-zinc-800">
              No API keys found. Create one to get started.
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/20">
                    <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{key.name}</div>
                    <div className="mt-1 text-xs font-mono text-zinc-500">
                      {key.display} • Created {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {key.last_used_at && <span className="text-xs text-zinc-400">Last used {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DocCard>

      <DocCard
        icon={Rocket}
        title="2. Quick Start"
        description="Use this order if you are integrating WaaS for the first time."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "Step 1",
              title: "Create an API key",
              body: "Generate a key above and store it safely. All developer API requests use Bearer authentication.",
            },
            {
              step: "Step 2",
              title: "Connect a session",
              body: "POST /v1/sessions, then poll GET /v1/sessions/:id for the QR (or listen to session.qr webhooks).",
            },
            {
              step: "Step 3",
              title: "Configure AI + webhooks",
              body: "Create an agent, bind it, toggle ai_enabled, and register a webhook for message.incoming.",
            },
            {
              step: "Step 4",
              title: "Send or auto-reply",
              body: "Built-in AI replies when enabled; or disable AI and reply yourself via /v1/messages after webhooks.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{item.step}</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>
      </DocCard>

      <DocCard
        icon={Smartphone}
        title="3. Sessions API (connect WhatsApp)"
        description="Create sessions, read live QR/status, and control AI binding entirely via API."
      >
        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create Session</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Starts a Baileys connection. Poll <code>GET /v1/sessions/:id</code> until <code>qr</code> is present, scan with WhatsApp Linked Devices, then wait for <code>status</code> open/active.
            </p>
            <CodeBlock code={snippets.createSession} onCopy={copyToClipboard} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">List Sessions</h3>
              <CodeBlock code={snippets.listSessions} onCopy={copyToClipboard} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Get Session (QR + status)</h3>
              <CodeBlock code={snippets.getSession} onCopy={copyToClipboard} />
            </div>
          </div>
        </div>
      </DocCard>

      <DocCard
        icon={Bot}
        title="4. AI Settings API"
        description="Create agents, update prompts/models, bind them to sessions, and enable or disable AI replies."
      >
        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create Agent</h3>
            <CodeBlock code={snippets.createAgent} onCopy={copyToClipboard} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Update Session AI (bind + prompt)</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Toggle <code>ai_enabled</code>, set <code>agent_id</code>, and optionally update the bound agent&apos;s prompt/provider/model in one call.
            </p>
            <CodeBlock code={snippets.updateSessionAi} onCopy={copyToClipboard} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Patch Agent</h3>
              <CodeBlock code={snippets.patchAgent} onCopy={copyToClipboard} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Bind Agent to Session</h3>
              <CodeBlock code={snippets.bindAgent} onCopy={copyToClipboard} />
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Tip: set <code>ai_enabled: false</code> if you want full custom handling via webhooks + <code>/v1/messages</code>. Incoming webhooks still fire either way.
          </div>
        </div>
      </DocCard>

      <DocCard
        icon={Webhook}
        title="5. Webhooks (real-time inbound)"
        description="Receive POST callbacks for incoming WhatsApp messages and session lifecycle events."
      >
        <div className="mb-8 space-y-4">
          <form onSubmit={createWebhook} className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Webhook URL</label>
                <input
                  type="url"
                  required
                  value={hookUrl}
                  onChange={(e) => setHookUrl(e.target.value)}
                  placeholder="https://your-app.com/webhooks/waas"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Secret (optional, HMAC)</label>
                <input
                  type="text"
                  value={hookSecret}
                  onChange={(e) => setHookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {supportedEvents.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleHookEvent(event)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    hookEvents.includes(event)
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={creatingHook || hookEvents.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingHook ? "Creating..." : "Add Webhook"}
            </button>
          </form>

          <div className="space-y-3">
            {hooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No webhooks yet. Add one above or via the API.
              </div>
            ) : (
              hooks.map((hook) => (
                <div
                  key={hook.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm text-zinc-900 dark:text-zinc-100">{hook.url}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {(hook.events || []).join(", ")}
                      {hook.has_secret ? " · signed" : ""}
                      {hook.is_active ? " · active" : " · inactive"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => testWebhook(hook.id)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => deleteWebhook(hook.id)}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Register via API</h3>
            <CodeBlock code={snippets.createWebhook} onCopy={copyToClipboard} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sample payload</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Headers include <code>X-WaaS-Event</code>, <code>X-WaaS-Delivery</code>, and when a secret is set, <code>X-WaaS-Signature: sha256=&lt;hmac&gt;</code>.
            </p>
            <CodeBlock code={snippets.webhookPayload} onCopy={copyToClipboard} />
          </div>
        </div>
      </DocCard>

      <DocCard
        icon={MessageSquareText}
        title="6. Messaging API"
        description="Send text or media directly through your connected WhatsApp sessions."
      >
        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">List Sessions</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Returns the sessions available to the API key owner. Use the returned <code>session_id</code> in later requests.
            </p>
            <CodeBlock code={snippets.listSessions} onCopy={copyToClipboard} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Send a Text Message</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Use this when you want to send a normal WhatsApp text message to one recipient.
            </p>
            <CodeBlock code={snippets.sendText} onCopy={copyToClipboard} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Send Media</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Media requests support <code>image</code>, <code>video</code>, <code>audio</code>, and <code>document</code> using a public URL.
            </p>
            <CodeBlock code={snippets.sendMedia} onCopy={copyToClipboard} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Send With a Template</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Instead of passing raw text, send a <code>template_id</code> and a <code>variables</code> object. The server resolves and renders the final message.
            </p>
            <CodeBlock code={snippets.sendTemplate} onCopy={copyToClipboard} />
          </div>
        </div>
      </DocCard>

      <DocCard
        icon={Megaphone}
        title="7. Campaign API"
        description="Create scheduled outbound campaigns, inspect them, add recipients, and start or stop them."
      >
        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create a Campaign</h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Creates a campaign in <code>draft</code> state and imports the provided contacts in the same request.
            </p>
            <CodeBlock code={snippets.createCampaign} onCopy={copyToClipboard} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">List Campaigns</h3>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Returns all campaigns owned by the API key owner.
              </p>
              <CodeBlock code={snippets.listCampaigns} onCopy={copyToClipboard} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Get One Campaign</h3>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Returns the campaign and its current contact list.
              </p>
              <CodeBlock code={snippets.getCampaign} onCopy={copyToClipboard} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Start or Stop a Campaign</h3>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Set <code>status</code> to <code>ready</code> to queue sending, or <code>stopped</code> to halt further processing.
              </p>
              <CodeBlock code={snippets.updateCampaign} onCopy={copyToClipboard} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add More Contacts</h3>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Append more recipients to an existing campaign later without recreating it.
              </p>
              <CodeBlock code={snippets.addCampaignContacts} onCopy={copyToClipboard} />
            </div>
          </div>
        </div>
      </DocCard>

      <DocCard
        icon={Layers3}
        title="8. Reference"
        description="Quick parameter reminders and important operational notes."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">Common Fields</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><code>session_id</code>: ID of your WhatsApp session.</li>
              <li><code>agent_id</code>: AI agent bound to a session.</li>
              <li><code>ai_enabled</code>: When false, no built-in AI reply (webhooks still fire).</li>
              <li><code>system_prompt</code> / <code>provider</code> / <code>model</code>: Agent AI config.</li>
              <li><code>to</code>: Recipient phone number with country code.</li>
              <li><code>type</code>: <code>text</code>, <code>image</code>, <code>video</code>, <code>audio</code>, or <code>document</code>.</li>
              <li><code>events</code>: Webhook events such as <code>message.incoming</code>, <code>session.qr</code>.</li>
              <li><code>contacts</code>: Array of recipients for campaigns.</li>
              <li><code>status</code>: Campaign state: <code>draft</code>, <code>ready</code>, <code>running</code>, <code>stopped</code>, <code>completed</code>.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">Operational Notes</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>API usage contributes to your plan message limits.</li>
              <li>Webhook delivery is async and does not block AI replies.</li>
              <li>Verify <code>X-WaaS-Signature</code> HMAC-SHA256 of the raw body with your secret.</li>
              <li>Campaigns are paced by <code>CAMPAIGN_RECIPIENTS_PER_HOUR</code>.</li>
              <li>Connect a real WhatsApp session before sending messages or campaigns.</li>
            </ul>
          </div>
        </div>
      </DocCard>
    </div>
  );
}
