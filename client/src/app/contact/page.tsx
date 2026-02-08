"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSent(true);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold">W</div>
            <span className="text-xl font-bold tracking-tight">WaaS</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
                <Link href="/" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400">Home</Link>
                <Link href="/blog" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400">Blog</Link>
                <Link href="/contact" className="text-indigo-600">Contact</Link>
            </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16">
            {/* Left Column: Info */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
                    Get in touch
                </h1>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-12">
                    Have questions about our pricing, plans, or features? We're here to help. Fill out the form and we'll get back to you as soon as possible.
                </p>

                <div className="space-y-8">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Email us</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">support@waas.local</p>
                            <p className="text-zinc-600 dark:text-zinc-400">sales@waas.local</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Live Chat</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">Available Mon-Fri, 9am - 5pm UTC</p>
                            <a href="#" className="text-indigo-600 hover:underline">Start a chat</a>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Office</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                123 Innovation Drive<br/>
                                Tech City, TC 90210
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right Column: Form */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-zinc-50 dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800"
            >
                {isSent ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 max-w-xs">
                            Thanks for reaching out. We've received your message and will get back to you shortly.
                        </p>
                        <button 
                            onClick={() => setIsSent(false)}
                            className="mt-8 text-indigo-600 font-medium hover:underline"
                        >
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="firstName" className="text-sm font-medium">First name</label>
                                <input 
                                    type="text" 
                                    id="firstName" 
                                    required
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
                                <input 
                                    type="text" 
                                    id="lastName" 
                                    required
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <input 
                                type="email" 
                                id="email" 
                                required
                                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                            <select 
                                id="subject"
                                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                <option>General Inquiry</option>
                                <option>Sales & Pricing</option>
                                <option>Technical Support</option>
                                <option>Partnership</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-medium">Message</label>
                            <textarea 
                                id="message" 
                                required
                                rows={4}
                                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                                placeholder="How can we help you?"
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Send Message
                                    <Send className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
      </main>
    </div>
  );
}
