"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-black dark:via-zinc-900 dark:to-zinc-950">
      <header className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg flex items-center justify-center text-white font-bold">W</div>
            <span className="font-semibold text-lg">WaaS</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-700 dark:text-zinc-300">
            <a href="#features" className="hover:underline">Features</a>
            <a href="#pricing" className="hover:underline">Pricing</a>
            <a href="#docs" className="hover:underline">Docs</a>
            <button className="rounded-full bg-black text-white px-4 py-2 text-sm">Get Started</button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid grid-cols-1 gap-12 md:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            <span className="inline-flex items-center rounded-full bg-indigo-100/60 px-3 py-1 text-sm font-medium text-indigo-700">New</span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
              Build powerful WhatsApp automation in minutes
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              WaaS provides easy-to-use tools and APIs to automate customer support, send alerts, and run campaigns — all powered by a secure self-hosted backend.
            </p>

            <div className="flex gap-4">
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                href="#"
                className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                Get started — it's free
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                href="#"
                className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                View docs
              </motion.a>
            </div>

            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Trusted by 1,200+ teams worldwide</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center"
          >
            <div className="rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 w-full max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">WaaS • Live</div>
                  <div className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Order #12345</div>
                </div>
                <div className="text-sm text-zinc-500">2m ago</div>
              </div>

              <div className="mt-4 text-zinc-700 dark:text-zinc-300">
                <div className="text-sm">Customer</div>
                <div className="mt-1 text-md font-medium">Jane Doe</div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-zinc-600">Status</div>
                <div className="text-sm font-medium text-green-600">Delivered</div>
              </div>

              <div className="mt-6 flex gap-3">
                <button className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Message</button>
                <button className="flex-1 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium">Details</button>
              </div>
            </div>

            <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-gradient-to-tr from-indigo-200 to-purple-300 opacity-70 blur-3xl"></div>
          </motion.div>
        </section>

        <section id="features" className="mt-20">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Features</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-2xl">Everything you need to run WhatsApp automation — webhooks, templating, scheduling, and analytics.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { title: "Webhooks", desc: "Real-time events pushed to your servers." },
              { title: "Templates", desc: "Create and reuse message templates." },
              { title: "Scheduling", desc: "Schedule messages and campaigns." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i, duration: 0.5 }}
                className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm dark:bg-zinc-900"
              >
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{i + 1}</div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center justify-between border-t border-zinc-100 pt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <div>© {new Date().getFullYear()} WaaS — Built with ❤️</div>
          <div className="flex items-center gap-4">
            <a href="#docs" className="hover:underline">Docs</a>
            <a href="#privacy" className="hover:underline">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
