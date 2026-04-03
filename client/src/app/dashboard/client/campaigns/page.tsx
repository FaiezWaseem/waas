"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  FileJson,
  FileSpreadsheet,
  Loader2,
  Megaphone,
  MessageSquareText,
  Phone,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import api from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
  session_id?: string | null;
  session_name?: string | null;
  session_phone?: string | null;
  status: string;
  contacts_count: number | string;
  message_template?: string | null;
};

type CampaignContact = {
  id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  send_status: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    void fetchCampaigns().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) {
      setContacts([]);
      return;
    }
    void fetchContacts(selectedCampaignId);
  }, [selectedCampaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  async function fetchCampaigns() {
    try {
      const response = await api.get("/campaigns");
      const nextCampaigns = response.data.campaigns || [];
      setCampaigns(nextCampaigns);
      if (!selectedCampaignId && nextCampaigns.length) {
        setSelectedCampaignId(nextCampaigns[0].id);
      } else if (selectedCampaignId && !nextCampaigns.some((item: Campaign) => item.id === selectedCampaignId)) {
        setSelectedCampaignId(nextCampaigns[0]?.id || "");
      }
    } catch (error) {
      console.error("Failed to fetch campaigns", error);
    }
  }

  async function fetchContacts(campaignId: string) {
    try {
      setContactsLoading(true);
      const response = await api.get(`/campaigns/${campaignId}/contacts`);
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    } finally {
      setContactsLoading(false);
    }
  }

  async function handleUploadContacts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedCampaignId) return;

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);

      const response = await api.post(`/campaigns/${selectedCampaignId}/import-contacts`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await Promise.all([fetchCampaigns(), fetchContacts(selectedCampaignId)]);
      alert(`Imported ${response.data.imported} contacts${response.data.skipped ? `, skipped ${response.data.skipped} duplicates` : ""}.`);
    } catch (error: any) {
      console.error("Failed to import contacts", error);
      alert(error?.response?.data?.error || "Failed to import contacts");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleDeleteCampaign(campaignId: string) {
    if (!window.confirm("Delete this campaign and all imported contacts?")) return;

    try {
      await api.delete(`/campaigns/${campaignId}`);
      await fetchCampaigns();
    } catch (error) {
      console.error("Failed to delete campaign", error);
      alert("Failed to delete campaign");
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!selectedCampaignId) return;

    try {
      await api.delete(`/campaigns/${selectedCampaignId}/contacts/${contactId}`);
      await Promise.all([fetchCampaigns(), fetchContacts(selectedCampaignId)]);
    } catch (error) {
      console.error("Failed to delete contact", error);
      alert("Failed to delete contact");
    }
  }

  async function handleUpdateCampaignStatus(status: string) {
    if (!selectedCampaignId) return;

    try {
      await api.patch(`/campaigns/${selectedCampaignId}`, { status });
      await fetchCampaigns();
    } catch (error) {
      console.error("Failed to update campaign", error);
      alert("Failed to update campaign");
    }
  }

  const canStopCampaign = selectedCampaign?.status === "running" || selectedCampaign?.status === "ready";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage bulk WhatsApp campaigns, update recipient lists, and review imported contacts.
          </p>
        </div>
        <Link
          href="/dashboard/client/campaigns/create"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">All Campaigns</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a campaign to manage its recipients.</p>
              </div>
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {campaigns.length} total
              </div>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  No campaigns yet. Create your first campaign on a separate page.
                </div>
                <Link
                  href="/dashboard/client/campaigns/create"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" />
                  Go to Create Campaign
                </Link>
              </div>
            ) : (
              campaigns.map((campaign) => {
                const active = selectedCampaignId === campaign.id;
                return (
                  <div
                    key={campaign.id}
                    className={`flex items-start justify-between gap-4 p-5 transition ${
                      active ? "bg-indigo-50/70 dark:bg-indigo-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <button onClick={() => setSelectedCampaignId(campaign.id)} className="min-w-0 flex-1 text-left">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</div>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {campaign.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {campaign.contacts_count} recipients
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {campaign.session_name || campaign.session_phone || "No session selected"}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => void handleDeleteCampaign(campaign.id)}
                      className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedCampaign ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Select a campaign to manage imported contacts.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selectedCampaign.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Import more contacts, review the list, and control the live campaign state from here.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleUpdateCampaignStatus("draft")}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Mark Draft
                  </button>
                  <button
                    onClick={() => void handleUpdateCampaignStatus(canStopCampaign ? "stopped" : "ready")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                      canStopCampaign ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {canStopCampaign ? "Stop Campaign" : "Mark Ready"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{contacts.length}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Imported contacts</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <MessageSquareText className="h-4 w-4" />
                  </div>
                  <div className="text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{selectedCampaign.status}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Campaign status</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedCampaign.session_name || selectedCampaign.session_phone || "No session assigned"}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Sending session</div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Import More Recipients</h4>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Upload CSV or JSON with fields like <code>name</code>, <code>phone</code>, and <code>email</code>.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Contacts
                    <input type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleUploadContacts} />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV import supported
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                    <FileJson className="h-3.5 w-3.5" />
                    JSON import supported
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Imported Contacts</h4>
                </div>

                {contactsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No contacts imported for this campaign yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-950">
                        <tr className="text-zinc-500 dark:text-zinc-400">
                          <th className="px-5 py-3 font-medium">Name</th>
                          <th className="px-5 py-3 font-medium">Phone</th>
                          <th className="px-5 py-3 font-medium">Email</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {contacts.map((contact) => (
                          <tr key={contact.id}>
                            <td className="px-5 py-4 text-zinc-900 dark:text-zinc-100">{contact.name || "-"}</td>
                            <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">{contact.phone}</td>
                            <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">{contact.email || "-"}</td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {contact.send_status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => void handleDeleteContact(contact.id)}
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
