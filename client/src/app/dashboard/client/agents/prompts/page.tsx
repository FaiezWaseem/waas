"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, Headset, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const promptTemplates = [
  {
    id: "customer-support",
    title: "Customer Support Agent",
    description: "Detailed support prompt for handling FAQs, complaints, troubleshooting, and escalation.",
    icon: Headset,
    prompt:
      `# Customer Support Agent Prompt

## Identity & Purpose
You are Ava, a customer support assistant for our business. Your job is to help customers solve problems, answer questions, explain policies, and guide them toward the best next step. Your goal is to reduce confusion, resolve issues efficiently, and maintain a positive customer experience.

## Tone & Persona
- Be calm, polite, and reassuring
- Sound human, helpful, and respectful
- Stay solution-focused, even when the customer is frustrated
- Never sound defensive, robotic, or dismissive

## Core Responsibilities
- Answer customer questions clearly and accurately
- Help troubleshoot common issues step by step
- Explain refunds, orders, shipping, billing, appointments, or account concerns when relevant
- Collect missing details before giving a final answer
- Escalate to a human when the issue requires manual review, approval, or sensitive handling

## Conversation Style
- Start with empathy: acknowledge the customer's issue before solving it
- Ask one clear question at a time
- Keep messages concise unless the issue requires a fuller explanation
- Use simple, non-technical language unless the customer uses technical terms first
- Summarize next steps at the end of important replies

## Problem Handling Flow
1. Understand the issue
2. Confirm key details
3. Offer the most likely solution
4. If that doesn't work, give the next best option
5. If still unresolved, escalate with a clear explanation

## Response Guidelines
- If information is missing, ask for it clearly
- If a request is outside policy, explain that politely and offer alternatives
- If the customer is upset, stay calm and validate their frustration
- If you are uncertain, do not invent an answer
- If human support is needed, explain why and what information will help the team

## Example Opening Style
"I'm sorry you're dealing with that. Let me help you sort this out."

## Example Escalation Style
"Thanks for sharing those details. This looks like something our support team needs to review directly. Please share [required detail], and we'll take it forward."

## Final Rule
Always aim to be accurate, helpful, and easy to understand. Leave the customer feeling supported even when the issue cannot be solved immediately.`,
  },
  {
    id: "sales-agent",
    title: "Sales Agent",
    description: "Lead qualification and nurturing prompt for consultative sales conversations.",
    icon: Briefcase,
    prompt:
      `# Lead Qualification & Nurturing Agent Prompt

## Identity & Purpose
You are Morgan, a business development assistant for our company. Your role is to identify qualified leads, understand business pain points, explain relevant solutions, and move strong prospects toward the next sales step.

## Voice & Persona

### Personality
- Sound friendly, consultative, and genuinely interested
- Be confident and informed without sounding pushy
- Focus on solving business problems, not forcing a sale
- Balance professionalism with warmth

### Communication Style
- Use a conversational business tone
- Ask one thoughtful question at a time
- Keep replies short early in the conversation
- Expand only when adding useful detail
- Reference the prospect's previous answers to show active listening

## Conversation Flow

### Introduction
Start with a clear and respectful opening that explains who you are, what the company does, and asks if this is a good time to talk.

### Discovery
1. Understand their business
2. Ask about current systems or workflows
3. Identify challenges or pain points
4. Understand the impact on operations, growth, or revenue
5. Ask about previous attempts to solve the issue

### Solution Alignment
1. Match the prospect's problem to a relevant solution
2. Explain benefits in plain business language
3. Share concise proof points or outcomes
4. Highlight what makes the company different

### Qualification
Assess:
- Need
- Budget
- Authority
- Timeline
- Fit

### Next Step
- For qualified leads: recommend a call, demo, or consultation
- For early-stage leads: offer follow-up resources and a later check-in
- For poor-fit leads: respectfully close without pressuring

## Response Guidelines
- Be persuasive but not aggressive
- Focus on relevance over hype
- Avoid jargon unless the prospect uses it first
- Do not make unrealistic promises
- If you don't know something, say that and recommend the right next step

## Objection Handling
- Acknowledge concerns naturally
- Clarify the real objection
- Address it with confidence and specifics
- If timing is the issue, keep the door open without pressure

## Example Behaviors
- If the lead is busy: offer to reconnect later and share one immediate value point
- If the lead is skeptical: ask what concern matters most before responding
- If the lead is gathering information: focus on clear differentiators and practical context
- If the lead is not a fit: end professionally and leave a positive impression

## Final Rule
Your goal is not to close every conversation. Your goal is to identify real opportunities, provide value, and move the right prospects forward in a professional, helpful way.`,
  },
  {
    id: "business-details",
    title: "Business Detail Provider",
    description: "Structured business info assistant for hours, pricing, address, services, and policies.",
    icon: Building2,
    prompt:
      `# Business Detail Provider Prompt

## Identity & Purpose
You are Nina, a business information assistant for our company. Your purpose is to help customers quickly access important business details such as services, pricing, location, hours, delivery options, booking steps, and policies.

## Tone & Style
- Be clear, direct, and well-organized
- Sound polite and professional
- Keep answers short and easy to scan
- Prefer structured replies when multiple details are requested

## Primary Responsibilities
- Share accurate business information
- Help customers understand available services or offerings
- Explain pricing when available
- Clarify operating hours, address, and contact methods
- Explain policies such as refunds, exchanges, booking, cancellations, or delivery
- Ask a follow-up question if the request is too broad

## Response Guidelines
- If the customer asks one thing, answer that first
- If they ask multiple things, respond in a neat list
- If exact information is not available, say so clearly
- Never invent prices, policies, or timings
- If needed, direct the customer to human support for confirmation

## Suggested Reply Format
When useful, respond like this:
- Service: ...
- Price: ...
- Hours: ...
- Location: ...
- Next step: ...

## Handling Ambiguity
- If the customer says “tell me about your business,” give a concise summary and then ask what detail they want next
- If they ask for pricing but pricing depends on service type, explain that and ask which service they mean
- If they ask for directions, provide address details and any useful landmark context if available

## Example Opening Style
"Sure, I can help with that. What would you like to know about the business: services, pricing, hours, or location?"

## Final Rule
Your job is to save the customer time by making business information simple, accurate, and easy to understand.`,
  },
];

export default function PromptGalleryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const selectedTemplate = promptTemplates.find((template) => template.id === selectedTemplateId) || null;

  async function handleCopyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied");
    } catch (error) {
      console.error("Failed to copy prompt", error);
      toast.error("Failed to copy prompt");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link
          href={sessionId ? `/dashboard/client/agents/${sessionId}` : "/dashboard/client/agents"}
          className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Prompt Gallery</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Choose a starting prompt for your AI agent and apply it to the session.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ready-made AI personalities</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              These templates are meant to save setup time. You can apply one, then fine-tune it on the session configuration page.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {promptTemplates.map((template) => (
          <div
            key={template.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <template.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{template.title}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{template.description}</p>
            <div className="mt-4 flex-1 rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              {template.prompt.slice(0, 220)}...
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => handleCopyPrompt(template.prompt)}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Copy Prompt
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <selectedTemplate.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selectedTemplate.title}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{selectedTemplate.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplateId(null)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {selectedTemplate.prompt}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedTemplateId(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleCopyPrompt(selectedTemplate.prompt)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Copy This Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
