"use client";

import { useState } from "react";
import { Save, Bot, Sparkles, Zap, Brain } from "lucide-react";
import { motion } from "framer-motion";

const models = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Most capable model for complex tasks",
    icon: Sparkles
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Excel at reasoning and coding",
    icon: Brain
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    description: "Fast and efficient for general tasks",
    icon: Zap
  }
];

export default function AgentsPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-4-turbo");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful customer support agent for WaaS. Be polite, concise, and helpful."
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Configuration</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Customize how your AI agent behaves and interacts with customers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
          {!isSaving && <Save className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">AI Model</h2>
          </div>
          
          <div className="space-y-4">
            {models.map((model) => (
              <label
                key={model.id}
                className={`relative flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all ${
                  selectedModel === model.id
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {model.provider}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {model.description}
                  </p>
                </div>
                <model.icon className={`h-5 w-5 ${
                  selectedModel === model.id ? "text-indigo-600" : "text-zinc-400"
                }`} />
              </label>
            ))}
          </div>
        </motion.div>

        {/* System Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">System Prompt</h2>
          </div>
          
          <div className="h-full">
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Define the personality, tone, and constraints for your agent.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="h-[300px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-200"
              placeholder="You are a helpful assistant..."
            />
            <div className="mt-2 flex justify-end">
              <span className="text-xs text-zinc-400">
                {systemPrompt.length} characters
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
