"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Trash2, Copy, Check, Terminal, Key } from "lucide-react";
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

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string, name: string, key: string } | null>(null);
  const [keyName, setKeyName] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // For local dev, we know backend is 4000. For prod, we should use env var or infer.
    // Ideally this comes from NEXT_PUBLIC_API_URL or similar.
    // If not set, we default to localhost:4000 for display purposes in dev mode.
    // Or we can try to guess based on window.location if it's a known deployment.
    // But since user explicitly asked for backend, let's try to be smart.
    
    // Fallback to localhost:4000 if we can't determine it, or use a relative path if they were same domain?
    // No, backend is typically separate or proxied. 
    // If proxied, it's same origin /api/v1. But user said "not frontend one".
    // We use environment variable or fallback to localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"; 
    setOrigin(backendUrl);
    
    fetchKeys();
    fetchSessions();
  }, []);

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
      toast.success("API Key created");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to create key");
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys(keys.filter((k) => k.id !== id));
      toast.success("API Key deleted");
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Developers</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Manage your API keys and access developer resources.
        </p>
      </div>

      {/* API Keys Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">API Keys</h2>
            <p className="text-sm text-zinc-500">
              Use these keys to authenticate your API requests. Keep them secret!
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Key
          </button>
        </div>

        {/* New Key Modal/Alert */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/40">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                      API Key Created Successfully
                    </h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      This is the only time we will show you this key. Please copy it and store it safely.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm text-zinc-800 border border-green-200 dark:bg-black dark:text-zinc-300 dark:border-green-900">
                        {newKey.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newKey.key)}
                        className="rounded-lg p-2 hover:bg-green-200 dark:hover:bg-green-800 transition"
                      >
                        <Copy className="h-4 w-4 text-green-700 dark:text-green-400" />
                      </button>
                    </div>
                    <button 
                      onClick={() => setNewKey(null)}
                      className="mt-4 text-sm font-medium text-green-700 underline dark:text-green-400"
                    >
                      I have saved it, close this
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form */}
        <AnimatePresence>
          {isCreating && !newKey && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={createKey}
              className="mb-6 flex gap-4 items-end rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
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
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Keys List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading keys...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
              No API keys found. Create one to get started.
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/20">
                    <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{key.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-1">
                      {key.display} • Created {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {key.last_used_at && (
                    <span className="text-xs text-zinc-400">
                      Last used {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Documentation Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="h-5 w-5 text-zinc-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Quick Start</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Get Sessions</h3>
            <p className="text-sm text-zinc-500 mb-4">
              List all your active sessions to get the <code>session_id</code>.
            </p>
            
            <div className="relative rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-300 overflow-x-auto mb-8">
              <button 
                onClick={() => copyToClipboard(`curl -X GET ${origin}/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                className="absolute top-4 right-4 p-2 rounded hover:bg-zinc-800 transition"
              >
                <Copy className="h-4 w-4" />
              </button>
              <div className="space-y-1">
                <span className="text-purple-400">curl</span> -X GET {origin}/v1/sessions \<br/>
                &nbsp;&nbsp;-H <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span>
              </div>
            </div>

            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Send a Message</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Send a WhatsApp message using your active session.
            </p>
            
            <div className="relative rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
              <button 
                onClick={() => copyToClipboard(`curl -X POST ${origin}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sessions[0]?.id || 'SESSION_ID'}",
    "to": "+1234567890",
    "text": "Hello from API!"
  }'`)}
                className="absolute top-4 right-4 p-2 rounded hover:bg-zinc-800 transition"
              >
                <Copy className="h-4 w-4" />
              </button>
              <div className="space-y-1">
                <span className="text-purple-400">curl</span> -X POST {origin}/v1/messages \<br/>
                &nbsp;&nbsp;-H <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span> \<br/>
                &nbsp;&nbsp;-H <span className="text-green-400">"Content-Type: application/json"</span> \<br/>
                &nbsp;&nbsp;-d <span className="text-yellow-400">'{`{
    "session_id": "${sessions[0]?.id || 'SESSION_ID'}",
    "to": "+1234567890",
    "text": "Hello from API!"
  }`}'</span>
              </div>
            </div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2 mt-8">Send Media</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Send images, videos, audio, or documents by providing a public URL.
            </p>
            
            <div className="relative rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
              <button 
                onClick={() => copyToClipboard(`curl -X POST ${origin}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "${sessions[0]?.id || 'SESSION_ID'}",
    "to": "+1234567890",
    "type": "image",
    "url": "https://example.com/image.png",
    "caption": "Check this out!"
  }'`)}
                className="absolute top-4 right-4 p-2 rounded hover:bg-zinc-800 transition"
              >
                <Copy className="h-4 w-4" />
              </button>
              <div className="space-y-1">
                <span className="text-purple-400">curl</span> -X POST {origin}/v1/messages \<br/>
                &nbsp;&nbsp;-H <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span> \<br/>
                &nbsp;&nbsp;-H <span className="text-green-400">"Content-Type: application/json"</span> \<br/>
                &nbsp;&nbsp;-d <span className="text-yellow-400">'{`{
    "session_id": "${sessions[0]?.id || 'SESSION_ID'}",
    "to": "+1234567890",
    "type": "image",
    "url": "https://example.com/image.png",
    "caption": "Check this out!"
  }`}'</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">Parameters</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">session_id</code>
                  <span>ID of your active WhatsApp session</span>
                </li>
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">to</code>
                  <span>Phone number (with country code)</span>
                </li>
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">type</code>
                  <span>Type of message: <code>text</code> (default), <code>image</code>, <code>video</code>, <code>audio</code>, <code>document</code></span>
                </li>
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">text</code>
                  <span>Message content (required for type=text)</span>
                </li>
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">url</code>
                  <span>Public URL of media (required for media types)</span>
                </li>
                <li className="flex gap-2">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">caption</code>
                  <span>Optional caption for media</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">Limits</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                API usage contributes to your plan's monthly message limits. 
                Rate limits apply based on your subscription tier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
