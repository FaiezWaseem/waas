"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const posts = [
  {
    id: 1,
    title: "Introducing WaaS v2.0: The Future of WhatsApp Automation",
    excerpt: "We've completely rewritten our core engine to be faster, more reliable, and easier to use. Here's what's new.",
    date: "Feb 8, 2026",
    readTime: "5 min read",
    author: "Faiez",
    category: "Product"
  },
  {
    id: 2,
    title: "How to Build a WhatsApp Chatbot in 5 Minutes",
    excerpt: "Learn how to use our new webhooks and API to build a simple auto-reply bot for your business.",
    date: "Feb 1, 2026",
    readTime: "8 min read",
    author: "Team WaaS",
    category: "Tutorial"
  },
  {
    id: 3,
    title: "Best Practices for WhatsApp Marketing Campaigns",
    excerpt: "Avoid getting banned and maximize your conversion rates with these proven strategies.",
    date: "Jan 25, 2026",
    readTime: "6 min read",
    author: "Marketing",
    category: "Guides"
  }
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Latest from our blog
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Updates, tutorials, and insights from the WaaS team.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-48 bg-zinc-100 dark:bg-zinc-800 relative">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                    <span className="text-4xl font-bold opacity-20">Post Cover</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                  <span className="text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-full">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </div>
                </div>

                <h2 className="text-xl font-bold mb-2 line-clamp-2 hover:text-indigo-600 transition-colors">
                  <Link href={`/blog/${post.id}`}>{post.title}</Link>
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 line-clamp-3 flex-1">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-zinc-500" />
                    </div>
                    {post.author}
                  </div>
                  <Link href={`/blog/${post.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1">
                    Read more <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
