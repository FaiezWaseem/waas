"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Loader2, ArrowLeft, Smartphone, CheckCircle2, Shield, MessageSquare, Bot, Sparkles, Zap, Brain, Type, AlertTriangle, XCircle, RefreshCw, X, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";
import { io } from "socket.io-client";

import { toast } from "sonner"
// --- Error Handling System ---

type ErrorSeverity = 'error' | 'warning';
type ErrorType = 'network' | 'validation' | 'api' | 'unknown';

interface AppError {
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  retry?: () => void;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/20 dark:bg-red-900/10" role="alert">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300 max-w-md">
            {this.state.error?.message || "An unexpected error occurred while loading this page."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Hook for Error Management
const useError = () => {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = (e: any, retry?: () => void) => {
    let message = "An unexpected error occurred.";
    let type: ErrorType = 'unknown';

    // Network Errors
    if (e.message === 'Network Error' || e.code === 'ERR_NETWORK' || !window.navigator.onLine) {
      message = "Network error. Please check your internet connection.";
      type = 'network';
    } 
    // API Errors
    else if (e.response) {
      message = e.response.data?.error || `Server error (${e.response.status})`;
      type = 'api';
    } 
    // Validation Errors (Custom)
    else if (e.type === 'validation') {
       message = e.message;
       type = 'validation';
    }
    else if (e.message) {
      message = e.message;
    }

    setError({ 
      message, 
      type, 
      severity: 'error',
      retry 
    });
    
    // Log for debugging (excluding PII if possible)
    console.error(`[AppError][${type}]`, e);
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
};


const models = [
  {
    id: "openai",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Most capable model for complex tasks",
    icon: Sparkles
  },
  {
    id: "openai-fast",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    description: "Fast and efficient for general tasks",
    icon: Brain
  },
  {
    id: "gemini-fast",
    name: "Gemini Flash 2.5",
    provider: "Google",
    description: "Fast and efficient for general tasks",
    icon: Zap
  }
];

export default function ConnectAgentPage() {
  const router = useRouter();
  const { error, handleError, clearError } = useError();
  const [step, setStep] = useState<'qr' | 'config' | 'agent'>('qr');
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Session Config
  const [config, setConfig] = useState({
    isEnabled: true,
    excludedNumbers: ""
  });

  // Agent Config
  const [agentConfig, setAgentConfig] = useState({
    name: "My Agent",
    model: "openai",
    systemPrompt: "You are a helpful customer support agent for WaaS. Be polite, concise, and helpful."
  });

  useEffect(() => {
    // Initialize session creation on mount
    createSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

    socket.on("connect", () => {
      console.log("Connected to socket.io");
      socket.emit("join_session", sessionId);
    });

    socket.on("qr", (data) => {
      console.log("Received QR update", data);
      if (data.sessionId === sessionId && data.qr) {
        setQrCode(data.qr);
      }
    });

    socket.on("status", (data) => {
      console.log("Received status update", data);
      if (data.sessionId === sessionId) {
         if (data.status === 'open' || data.status === 'active') {
            console.log("✅ Connection established!");
            setStep('config');
         }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const createSession = async () => {
    clearError();
    try {
      setIsConnecting(true);
      const res = await api.post('/sessions', {}); // Create session without agent initially
      setSessionId(res.data.id);
      if (res.data.qr) {
        setQrCode(res.data.qr);
      }
    } catch (e: any) {
      toast.error(e.message , {
        position : 'top-center'
      });
      handleError(e, createSession);
    } finally {
      setIsConnecting(false);
    }
  };

  // Polling fallback
  useEffect(() => {
    if (!sessionId || step !== 'qr') return;
    
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}`);
        const s = res.data.session;
        
        if (s.qr) setQrCode(s.qr);

        if (s.status === 'open' || s.status === 'active') {
          console.log("✅ Connection established (via poll)!");
          setStep('config');
        }
      } catch (e) {
        // ignore errors during poll
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, step]);

  const handleFinish = async () => {
    if (!sessionId) return;
    clearError();
    
    try {
      if (!agentConfig.name.trim()) throw { type: 'validation', message: "Agent name is required" };
      
      // 1. Create Agent
      const agentRes = await api.post('/agents', {
        name: agentConfig.name,
        system_prompt: agentConfig.systemPrompt,
        model: agentConfig.model,
        excluded_numbers: config.excludedNumbers
      });
      const agentId = agentRes.data.id;

      // 2. Bind Agent to Session
      await api.post(`/agents/${agentId}/bind-session`, { sessionId });

      router.push('/dashboard/client/agents');
    } catch (e: any) {
      console.log(e.message)
      handleError(e);
    }
  };

  return (
    <ErrorBoundary>
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connect New Session</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Link a WhatsApp account and configure your AI agent.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Progress / Steps Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold mb-4">Setup Progress</h3>
            <div className="space-y-4">
              {/* Step 1: Link WhatsApp */}
              <div className={`flex gap-3 ${step === 'qr' ? 'text-indigo-600' : (step === 'config' || step === 'agent') ? 'text-green-600' : 'text-zinc-400'}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  step === 'qr' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : (step === 'config' || step === 'agent')
                      ? 'border-green-600 bg-green-50 text-green-600'
                      : 'border-zinc-200 dark:border-zinc-700'
                }`}>
                  {(step === 'config' || step === 'agent') ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">1</span>}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Link WhatsApp</span>
                  <span className="text-xs text-zinc-500">Scan QR Code</span>
                </div>
              </div>
              
              {/* Step 2: Session Settings */}
              <div className={`flex gap-3 ${step === 'config' ? 'text-indigo-600' : step === 'agent' ? 'text-green-600' : 'text-zinc-400'}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  step === 'config' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : step === 'agent'
                      ? 'border-green-600 bg-green-50 text-green-600'
                      : 'border-zinc-200 dark:border-zinc-700'
                }`}>
                  {step === 'agent' ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">2</span>}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${step === 'config' || step === 'agent' ? 'text-zinc-900 dark:text-zinc-100' : ''}`}>Session Settings</span>
                  <span className="text-xs text-zinc-500">Enable & Exclusions</span>
                </div>
              </div>

              {/* Step 3: Agent Configuration */}
              <div className={`flex gap-3 ${step === 'agent' ? 'text-indigo-600' : 'text-zinc-400'}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  step === 'agent' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}>
                  <span className="text-xs font-bold">3</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${step === 'agent' ? 'text-zinc-900 dark:text-zinc-100' : ''}`}>Agent Configuration</span>
                  <span className="text-xs text-zinc-500">Model & Prompt</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50 p-6 dark:bg-indigo-900/10">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-semibold">Secure Connection</span>
            </div>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
              Your WhatsApp session is encrypted and securely stored. We never access your personal messages, only those relevant to the agent.
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
          >
            {step === 'qr' && (
              <div className="flex flex-col items-center justify-center space-y-8 py-4">

                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-20 blur-lg" />
                  <div className="relative flex h-72 w-72 items-center justify-center rounded-xl bg-white border-2 border-dashed border-zinc-200 dark:bg-black dark:border-zinc-700">
                    {error ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center w-full">
                        <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
                        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Connection Failed</h4>
                        <p className="text-xs text-red-600 dark:text-red-300 mb-4 max-w-[200px] break-words">
                          {error.message}
                        </p>
                        <button 
                          onClick={() => createSession()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Try Again
                        </button>
                      </div>
                    ) : isConnecting ? (
                      <div className="flex flex-col items-center gap-4 text-indigo-600">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <span className="text-sm font-medium animate-pulse">Establishing connection...</span>
                      </div>
                    ) : qrCode ? (
                       <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
                          <QRCodeSVG value={qrCode} size={256} level="H" includeMargin={true} />
                          <p className="mt-4 text-xs text-zinc-500">
                            Scan with WhatsApp
                          </p>
                       </div>
                    ) : (
                      <QrCode className="h-56 w-56 text-zinc-800 dark:text-zinc-200" />
                    )}
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-6">
                  <div className="space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <h4 className="font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-zinc-500" />
                      Instructions
                    </h4>
                    <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-3 list-decimal list-inside marker:text-zinc-400">
                      <li>Open WhatsApp on your phone</li>
                      <li>Go to <strong>Settings</strong> {'>'} <strong>Linked Devices</strong></li>
                      <li>Tap on <strong>Link a Device</strong></li>
                      <li>Point your phone camera at this screen</li>
                    </ol>
                  </div>
                  
                </div>
              </div>
            )}

            {step === 'config' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    Session Settings
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Configure how the AI agent handles messages for this number.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-5 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-900 dark:text-zinc-100">Enable Agent Responses</label>
                      <p className="text-sm text-zinc-500">Allow the agent to automatically reply to incoming messages.</p>
                    </div>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        config.isEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          config.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Excluded Numbers */}
                  <div className="space-y-3">
                    <label className="font-medium text-zinc-900 dark:text-zinc-100">Excluded Contacts & Groups</label>
                    <p className="text-sm text-zinc-500">
                      The agent will ignore messages from these numbers or group names.
                    </p>
                    <textarea
                      value={config.excludedNumbers}
                      onChange={(e) => setConfig(prev => ({ ...prev, excludedNumbers: e.target.value }))}
                      className="h-32 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-black transition-all"
                      placeholder="e.g. +1234567890, Family Group, Team Chat..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setStep('qr')}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('agent')}
                    className="ml-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {step === 'agent' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-indigo-600" />
                    Agent Configuration
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Select the AI model and define its personality.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Agent Name */}
                  <div className="space-y-3">
                    <label className="font-medium text-zinc-900 dark:text-zinc-100">Agent Name</label>
                    <div className="relative">
                      <Type className="absolute left-3 top-2.5 h-5 w-5 text-zinc-400" />
                      <input
                        type="text"
                        value={agentConfig.name}
                        onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 pl-10 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                        placeholder="My Awesome Agent"
                      />
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-3">
                    <label className="font-medium text-zinc-900 dark:text-zinc-100">AI Model</label>
                    <div className="grid gap-3 sm:grid-cols-1">
                      {models.map((model) => (
                        <label
                          key={model.id}
                          className={`relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                            agentConfig.model === model.id
                              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-500"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="model"
                            value={model.id}
                            checked={agentConfig.model === model.id}
                            onChange={(e) => setAgentConfig(prev => ({ ...prev, model: e.target.value }))}
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
                            agentConfig.model === model.id ? "text-indigo-600" : "text-zinc-400"
                          }`} />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-3">
                    <label className="font-medium text-zinc-900 dark:text-zinc-100">System Prompt</label>
                    <p className="text-sm text-zinc-500">
                      Define the personality, tone, and constraints for your agent.
                    </p>
                    <textarea
                      value={agentConfig.systemPrompt}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="h-48 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-black transition-all"
                      placeholder="You are a helpful assistant..."
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-zinc-400">
                        {agentConfig.systemPrompt.length} characters
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setStep('config')}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    className="ml-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                  >
                    Save & Finish
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
