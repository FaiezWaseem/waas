"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Globe, Award, Heart } from "lucide-react";

export default function AboutPage() {
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
                <Link href="/contact" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400">Contact</Link>
            </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-24">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
                    We're building the future of messaging
                </h1>
                <p className="text-xl text-zinc-600 dark:text-zinc-400">
                    WaaS is on a mission to democratize WhatsApp automation for businesses of all sizes.
                </p>
            </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 border-y border-zinc-100 dark:border-zinc-900 py-12">
            {[
                { label: "Active Users", value: "10,000+" },
                { label: "Messages Sent", value: "50M+" },
                { label: "Countries", value: "120+" },
                { label: "Uptime", value: "99.9%" }
            ].map((stat, i) => (
                <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center"
                >
                    <div className="text-3xl font-bold text-indigo-600 mb-1">{stat.value}</div>
                    <div className="text-sm font-medium text-zinc-500">{stat.label}</div>
                </motion.div>
            ))}
        </div>

        {/* Story */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
            <div>
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-zinc-600 dark:text-zinc-400 text-lg">
                    <p>
                        It all started in 2024 when we realized that existing WhatsApp solutions were either too expensive or too complex for small businesses.
                    </p>
                    <p>
                        We wanted to build something different: a self-hosted, privacy-focused solution that gives developers full control over their data and infrastructure.
                    </p>
                    <p>
                        Today, WaaS powers communication for thousands of companies worldwide, from local startups to enterprise organizations.
                    </p>
                </div>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-3xl aspect-square flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-bold text-2xl">Team Photo Placeholder</span>
            </div>
        </div>

        {/* Values */}
        <div className="mb-24">
            <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { icon: <Users />, title: "Customer First", desc: "We build for you. Your feedback drives our roadmap." },
                    { icon: <Award />, title: "Quality Code", desc: "We take pride in writing clean, efficient, and reliable software." },
                    { icon: <Heart />, title: "Open & Honest", desc: "Transparency is at the core of everything we do." }
                ].map((val, i) => (
                    <motion.div 
                        key={val.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-50 dark:bg-zinc-900 p-8 rounded-2xl"
                    >
                        <div className="h-12 w-12 rounded-xl bg-white dark:bg-black flex items-center justify-center text-indigo-600 shadow-sm mb-6">
                            {val.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{val.title}</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">{val.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}
