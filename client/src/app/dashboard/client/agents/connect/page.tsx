"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, QrCode, RefreshCw, Shield, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import { toast } from "sonner";

import api from "@/lib/api";

type ErrorSeverity = "error" | "warning";
type ErrorType = "network" | "validation" | "api" | "unknown";

interface AppError {
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  retry?: () => void;
}

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
        <div
          className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/20 dark:bg-red-900/10"
          role="alert"
        >
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
          <p className="mt-2 max-w-md text-sm text-red-600 dark:text-red-300">
            {this.state.error?.message || "An unexpected error occurred while loading this page."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
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

const useError = () => {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = (e: any, retry?: () => void) => {
    let message = "An unexpected error occurred.";
    let type: ErrorType = "unknown";

    if (e.message === "Network Error" || e.code === "ERR_NETWORK" || !window.navigator.onLine) {
      message = "Network error. Please check your internet connection.";
      type = "network";
    } else if (e.response) {
      message = e.response.data?.error || `Server error (${e.response.status})`;
      type = "api";
    } else if (e.type === "validation") {
      message = e.message;
      type = "validation";
    } else if (e.message) {
      message = e.message;
    }

    setError({
      message,
      type,
      severity: "error",
      retry,
    });

    console.error(`[AppError][${type}]`, e);
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
};

export default function ConnectSessionPage() {
  const router = useRouter();
  const { error, handleError, clearError } = useError();
  const [step, setStep] = useState<"qr" | "done">("qr");
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

    socket.on("connect", () => {
      socket.emit("join_session", sessionId);
    });

    socket.on("qr", (data) => {
      if (data.sessionId === sessionId && data.qr) {
        setQrCode(data.qr);
      }
    });

    socket.on("status", (data) => {
      if (data.sessionId === sessionId && (data.status === "open" || data.status === "active")) {
        setStep("done");
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
      const res = await api.post("/sessions", {});
      setSessionId(res.data.id);
      if (res.data.qr) {
        setQrCode(res.data.qr);
      }
    } catch (e: any) {
      toast.error(e.message, { position: "top-center" });
      handleError(e, createSession);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (!sessionId || step !== "qr") return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}`);
        const session = res.data.session;

        if (session.qr) setQrCode(session.qr);

        if (session.status === "open" || session.status === "active") {
          setStep("done");
        }
      } catch {
        // Ignore polling errors here; socket updates or retry action will recover the flow.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, step]);

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-5xl space-y-8 py-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connect New Session</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Link a WhatsApp account. AI stays disabled until you enable it manually.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 font-semibold">Setup Progress</h3>
              <div className="space-y-4">
                <div className={`flex gap-3 ${step === "qr" ? "text-indigo-600" : "text-green-600"}`}>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      step === "qr"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-green-600 bg-green-50 text-green-600"
                    }`}
                  >
                    {step === "done" ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">1</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Link WhatsApp</span>
                    <span className="text-xs text-zinc-500">Scan QR code</span>
                  </div>
                </div>

                <div className={`flex gap-3 ${step === "done" ? "text-green-600" : "text-zinc-400"}`}>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      step === "done"
                        ? "border-green-600 bg-green-50 text-green-600"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {step === "done" ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">2</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${step === "done" ? "text-zinc-900 dark:text-zinc-100" : ""}`}>
                      Session Ready
                    </span>
                    <span className="text-xs text-zinc-500">AI disabled by default</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 p-6 dark:bg-indigo-900/10">
              <div className="mb-2 flex items-center gap-2 text-indigo-600">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-semibold">Secure Connection</span>
              </div>
              <p className="text-xs leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
                Your WhatsApp session is encrypted and securely stored. No AI agent is attached during session creation.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {step === "qr" ? (
                <div className="flex flex-col items-center justify-center space-y-8 py-4">
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-20 blur-lg" />
                    <div className="relative flex h-72 w-72 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-white dark:border-zinc-700 dark:bg-black">
                      {error ? (
                        <div className="flex w-full flex-col items-center justify-center p-6 text-center">
                          <AlertTriangle className="mb-3 h-10 w-10 text-red-500" />
                          <h4 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Connection Failed</h4>
                          <p className="mb-4 max-w-[200px] break-words text-xs text-red-600 dark:text-red-300">
                            {error.message}
                          </p>
                          <button
                            onClick={createSession}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-700"
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
                        <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4">
                          <QRCodeSVG value={qrCode} size={256} level="H" includeMargin />
                          <p className="mt-4 text-xs text-zinc-500">Scan with WhatsApp</p>
                        </div>
                      ) : (
                        <QrCode className="h-56 w-56 text-zinc-800 dark:text-zinc-200" />
                      )}
                    </div>
                  </div>

                  <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                      <h4 className="flex items-center gap-2 font-medium">
                        <Smartphone className="h-4 w-4 text-zinc-500" />
                        Instructions
                      </h4>
                      <ol className="list-inside list-decimal space-y-3 text-sm text-zinc-600 marker:text-zinc-400 dark:text-zinc-400">
                        <li>Open WhatsApp on your phone</li>
                        <li>Go to <strong>Settings</strong> {" > "} <strong>Linked Devices</strong></li>
                        <li>Tap <strong>Link a Device</strong></li>
                        <li>Point your phone camera at this screen</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold">Session connected</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Your WhatsApp account is linked. This session was created without any default AI configuration.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6 dark:border-zinc-800 dark:bg-zinc-800/20">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">What happens next</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          You can manage this from the sessions page. If you want automated replies later, open the session details and enable AI there.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <button
                      onClick={() => router.push("/dashboard/client/agents")}
                      className="ml-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30"
                    >
                      Go to Sessions
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
