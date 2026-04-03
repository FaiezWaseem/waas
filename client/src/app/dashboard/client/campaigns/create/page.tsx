"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { ArrowLeft, FileJson, FileSpreadsheet, Loader2, Megaphone, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type SessionOption = {
  id: string;
  status: string;
  contact_name?: string | null;
  phone_number?: string | null;
};

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    session_id: "",
    message_template: "",
  });

  useEffect(() => {
    void fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      setLoadingSessions(true);
      const response = await api.get("/sessions");
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setLoadingSessions(false);
    }
  }

  function handleSelectCampaignFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleCreateCampaign() {
    if (!form.name.trim()) {
      alert("Campaign name is required");
      return;
    }
    if (!selectedFile) {
      alert("CSV or JSON contact file is required");
      return;
    }

    try {
      setSaving(true);
      const response = await api.post("/campaigns", {
        name: form.name.trim(),
        session_id: form.session_id || null,
        message_template: form.message_template.trim() || null,
      });

      const campaignId = response.data.id;
      if (!campaignId) throw new Error("Campaign was created without an id");

      const data = new FormData();
      data.append("file", selectedFile);
      await api.post(`/campaigns/${campaignId}/import-contacts`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push("/dashboard/client/campaigns");
    } catch (error: any) {
      console.error("Failed to create campaign", error);
      alert(error?.response?.data?.error || "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3">
            <Link
              href="/dashboard/client/campaigns"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Set the campaign details and upload a required CSV or JSON file with recipients.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">New Campaign Setup</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">A contacts file is required to complete campaign creation.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Campaign Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputCls}
              placeholder="April School Software Outreach"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sending Session</label>
            <select
              value={form.session_id}
              onChange={(e) => setForm((prev) => ({ ...prev, session_id: e.target.value }))}
              className={inputCls}
              disabled={loadingSessions}
            >
              <option value="">{loadingSessions ? "Loading sessions..." : "Choose a connected WhatsApp session"}</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {(session.contact_name || session.phone_number || session.id.slice(0, 8))} {session.status ? `(${session.status})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Campaign Message</label>
            <textarea
              value={form.message_template}
              onChange={(e) => setForm((prev) => ({ ...prev, message_template: e.target.value }))}
              className={`${inputCls} min-h-40 resize-y`}
              placeholder="Assalamualaikum. We saw your interest and wanted to share details about our software solutions..."
            />
          </div>

          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Contacts File</div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Required. Upload a <code>.csv</code> or <code>.json</code> file with recipient data.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                <Upload className="h-4 w-4" />
                Choose File
                <input type="file" accept=".csv,.json" className="hidden" onChange={handleSelectCampaignFile} />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 dark:bg-zinc-900">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV supported
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 dark:bg-zinc-900">
                <FileJson className="h-3.5 w-3.5" />
                JSON supported
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <a
                href="/sample-campaign-contacts.csv"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Demo CSV
              </a>
              <a
                href="/sample-campaign-contacts.json"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <FileJson className="h-4 w-4" />
                Download Demo JSON
              </a>
            </div>

            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                selectedFile
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
              }`}
            >
              {selectedFile ? `Selected file: ${selectedFile.name}` : "No file selected yet. Campaign creation is disabled until a file is uploaded."}
            </div>
          </div>

          <button
            onClick={handleCreateCampaign}
            disabled={saving || !selectedFile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Campaign With Contacts
          </button>
        </div>
      </section>
    </div>
  );
}
