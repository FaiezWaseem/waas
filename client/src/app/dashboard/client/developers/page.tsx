"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  Key,
  BookOpen,
  Rocket,
  MessageSquareText,
  Megaphone,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
  display: string;
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

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    setOrigin(backendUrl);
    fetchKeys();
    fetchSessions();
  }, []);

  const sampleSessionId = sessions[0]?.id || "SESSION_ID";

  const snippets = useMemo(() => {
    return {
      listSessions: `curl -X GET ${origin}/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
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
              Everything you need to create API keys, send WhatsApp messages, create campaigns, and control scheduled outbound flows from your own apps.
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
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "Step 1",
              title: "Create an API key",
              body: "Generate a key above and store it safely. All developer API requests use Bearer authentication.",
            },
            {
              step: "Step 2",
              title: "Fetch your sessions",
              body: "List your connected WhatsApp sessions so you know which session_id to use in requests.",
            },
            {
              step: "Step 3",
              title: "Send messages or campaigns",
              body: "Use the message endpoints for direct sends or the campaign endpoints for scheduled outreach.",
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
        icon={MessageSquareText}
        title="3. Messaging API"
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
        title="4. Campaign API"
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
        title="5. Reference"
        description="Quick parameter reminders and important operational notes."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">Common Fields</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><code>session_id</code>: ID of your active WhatsApp session.</li>
              <li><code>to</code>: Recipient phone number with country code.</li>
              <li><code>type</code>: <code>text</code>, <code>image</code>, <code>video</code>, <code>audio</code>, or <code>document</code>.</li>
              <li><code>text</code>: Message body for text sends.</li>
              <li><code>template_id</code>: Template to render instead of sending raw text.</li>
              <li><code>variables</code>: JSON object used to replace placeholders in a template.</li>
              <li><code>url</code>: Public media URL for media sends.</li>
              <li><code>caption</code>: Optional caption for media messages.</li>
              <li><code>contacts</code>: Array of recipients for campaign creation or append operations.</li>
              <li><code>status</code>: Campaign state such as <code>draft</code>, <code>ready</code>, <code>running</code>, <code>stopped</code>, or <code>completed</code>.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">Operational Notes</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>API usage contributes to your plan message limits.</li>
              <li>Campaigns do not blast instantly; they are paced by the campaign scheduler.</li>
              <li>The per-hour campaign throughput is controlled on the server via <code>CAMPAIGN_RECIPIENTS_PER_HOUR</code>.</li>
              <li>Use <code>{"{{name}}"}</code>, <code>{"{{phone}}"}</code>, and <code>{"{{email}}"}</code> placeholders inside campaign templates.</li>
              <li>Use a real connected WhatsApp session before calling message or campaign endpoints.</li>
            </ul>
          </div>
        </div>
      </DocCard>
    </div>
  );
}
