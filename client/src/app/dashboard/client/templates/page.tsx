"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileText, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import api from "@/lib/api";

type Template = {
  id: string;
  name: string;
  category?: string | null;
  body: string;
  is_predefined?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "",
    body: "",
  });

  useEffect(() => {
    void fetchTemplates().finally(() => setLoading(false));
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  async function fetchTemplates() {
    try {
      const response = await api.get("/templates");
      const nextTemplates = response.data.templates || [];
      setTemplates(nextTemplates);
      if (!selectedTemplateId && nextTemplates.length) {
        selectTemplate(nextTemplates[0]);
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    }
  }

  function selectTemplate(template: Template) {
    setSelectedTemplateId(template.id);
    setForm({
      id: template.id,
      name: template.name || "",
      category: template.category || "",
      body: template.body || "",
    });
  }

  function resetForm() {
    setSelectedTemplateId("");
    setForm({ id: "", name: "", category: "", body: "" });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.body.trim()) {
      alert("Template name and body are required");
      return;
    }

    try {
      setSaving(true);
      if (selectedTemplate && !selectedTemplate.is_predefined) {
        await api.patch(`/templates/${selectedTemplate.id}`, {
          name: form.name.trim(),
          category: form.category.trim() || null,
          body: form.body,
        });
      } else {
        const response = await api.post("/templates", {
          name: form.name.trim(),
          category: form.category.trim() || null,
          body: form.body,
        });
        if (response.data.id) setSelectedTemplateId(response.data.id);
      }

      await fetchTemplates();
    } catch (error: any) {
      console.error("Failed to save template", error);
      alert(error?.response?.data?.error || "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTemplate || selectedTemplate.is_predefined) return;
    if (!window.confirm("Delete this custom template?")) return;

    try {
      await api.delete(`/templates/${selectedTemplate.id}`);
      resetForm();
      await fetchTemplates();
    } catch (error) {
      console.error("Failed to delete template", error);
      alert("Failed to delete template");
    }
  }

  function handleUsePreset(template: Template) {
    setSelectedTemplateId(template.id);
    setForm({
      id: "",
      name: template.name,
      category: template.category || "",
      body: template.body,
    });
  }

  const builtinTemplates = templates.filter((item) => item.is_predefined);
  const customTemplates = templates.filter((item) => !item.is_predefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Create reusable message templates, start from predefined examples, and send them later through the API with variables JSON.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Custom Template
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Predefined Templates
              </div>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <div className="p-6 text-sm text-zinc-500">Loading templates...</div>
              ) : (
                builtinTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleUsePreset(template)}
                    className="w-full p-5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{template.name}</div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{template.category || "General"}</div>
                    <div className="line-clamp-3 text-sm text-zinc-500 dark:text-zinc-400">{template.body}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-indigo-600" />
                Custom Templates
              </div>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {customTemplates.length === 0 ? (
                <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">No custom templates yet.</div>
              ) : (
                customTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className={`w-full p-5 text-left transition ${
                      selectedTemplateId === template.id ? "bg-indigo-50 dark:bg-indigo-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{template.name}</div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{template.category || "General"}</div>
                    <div className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{template.body}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedTemplate?.is_predefined ? "Create From Preset" : selectedTemplate ? "Edit Template" : "New Template"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                You can use square-bracket placeholders like <code>[Name]</code>, <code>[Date]</code>, or API-style placeholders like <code>{"{{name}}"}</code>.
              </p>
            </div>
            {selectedTemplate && !selectedTemplate.is_predefined && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Template Name</label>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} placeholder="OTP Notification" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
              <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className={inputCls} placeholder="OTP, Reminder, Sales..." />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Template Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                className={`${inputCls} min-h-80 resize-y`}
                placeholder="Hi [Name], your code is [123456]"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">API usage example</div>
              <code className="block whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">{`{
  "session_id": "SESSION_ID",
  "to": "+923001112233",
  "template_id": "${selectedTemplate && !selectedTemplate.is_predefined ? selectedTemplate.id : "TEMPLATE_ID"}",
  "variables": {
    "Name": "Ali",
    "Date": "12 Apr 2026"
  }
}`}</code>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {selectedTemplate && !selectedTemplate.is_predefined ? "Save Changes" : "Save As Custom Template"}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(form.body)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Copy className="h-4 w-4" />
                Copy Body
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
