"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowLeft, Share2 } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

// Mock data - in a real app this would come from an API/CMS
const posts = [
  {
    id: 1,
    title: "Introducing WaaS v2.0: The Future of WhatsApp Automation",
    content: `
      <p>We are thrilled to announce the release of WaaS v2.0, a major update that completely redefines how businesses interact with WhatsApp.</p>
      
      <h2>What's New?</h2>
      <p>Our team has been working tirelessly for the past six months to bring you a more robust, faster, and scalable platform. Here are the key highlights:</p>
      
      <ul>
        <li><strong>New Core Engine:</strong> We rewrote our message processing engine from scratch in Rust, resulting in 10x faster message delivery.</li>
        <li><strong>Enhanced Webhooks:</strong> You can now subscribe to granular events like 'message_read', 'message_failed', and 'contact_blocked'.</li>
        <li><strong>Visual Flow Builder:</strong> Build complex chatbots using our new drag-and-drop interface. No coding required!</li>
      </ul>

      <h2>Why the Change?</h2>
      <p>As our user base grew, we noticed that many of you were pushing the limits of our previous architecture. We wanted to ensure that WaaS could scale with you, whether you're sending 100 messages a day or 100,000.</p>

      <h2>Getting Started</h2>
      <p>To upgrade to v2.0, simply log in to your dashboard and follow the migration guide. It takes less than 5 minutes, and all your existing data will be preserved.</p>
    `,
    date: "Feb 8, 2026",
    readTime: "5 min read",
    author: "Faiez",
    role: "Founder & CEO",
    category: "Product"
  },
  {
    id: 2,
    title: "How to Build a WhatsApp Chatbot in 5 Minutes",
    content: `
      <p>Chatbots are a great way to automate customer support and engagement. In this tutorial, we'll show you how to build a simple auto-reply bot using WaaS.</p>

      <h2>Prerequisites</h2>
      <p>Before we begin, make sure you have:</p>
      <ul>
        <li>A WaaS account (sign up for free)</li>
        <li>A WhatsApp number linked to your account</li>
        <li>A basic understanding of HTTP webhooks</li>
      </ul>

      <h2>Step 1: Set up a Webhook</h2>
      <p>Go to your WaaS dashboard and navigate to the "Webhooks" section. Create a new webhook pointing to your server's endpoint (e.g., https://api.yoursite.com/webhook).</p>

      <h2>Step 2: Handle Incoming Messages</h2>
      <p>When a user sends a message to your WhatsApp number, WaaS will send a POST request to your webhook. Here's a simple Node.js example to handle it:</p>

      <pre><code>app.post('/webhook', (req, res) => {
  const { from, body } = req.body;
  
  if (body.toLowerCase() === 'hello') {
    sendMessage(from, 'Hi there! How can I help you?');
  }
  
  res.sendStatus(200);
});</code></pre>

      <h2>Step 3: Test It Out</h2>
      <p>Send "hello" to your WhatsApp number. You should receive an instant reply! It's that simple.</p>
    `,
    date: "Feb 1, 2026",
    readTime: "8 min read",
    author: "Team WaaS",
    role: "Developer Relations",
    category: "Tutorial"
  },
  {
    id: 3,
    title: "Best Practices for WhatsApp Marketing Campaigns",
    content: `
      <p>WhatsApp has an open rate of over 98%, making it one of the most effective marketing channels. However, it also has strict policies to prevent spam.</p>

      <h2>1. Get Opt-in Consent</h2>
      <p>Never send messages to users who haven't explicitly agreed to receive them. This is the fastest way to get your number banned.</p>

      <h2>2. Provide Value, Not Just Noise</h2>
      <p>Don't just blast promotional offers. Send useful updates, order notifications, or personalized content that your users actually care about.</p>

      <h2>3. Respect Opt-out Requests</h2>
      <p>Always provide an easy way for users to unsubscribe. For example, "Reply STOP to unsubscribe". If a user asks to stop, honor it immediately.</p>

      <h2>Conclusion</h2>
      <p>By following these simple rules, you can build a sustainable and high-converting marketing channel on WhatsApp.</p>
    `,
    date: "Jan 25, 2026",
    readTime: "6 min read",
    author: "Marketing Team",
    role: "Growth",
    category: "Guides"
  }
];

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  
  const post = posts.find(p => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Link href="/blog" className="text-indigo-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
            <Link href="/blog" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-medium">
                        {post.category}
                    </span>
                    <span className="text-zinc-400 text-sm">•</span>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                    </div>
                    <span className="text-zinc-400 text-sm">•</span>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-8 leading-tight">
                    {post.title}
                </h1>

                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-8 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                            <User className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-200">{post.author}</div>
                            <div className="text-xs text-zinc-500">{post.role}</div>
                        </div>
                    </div>
                    <button className="text-zinc-500 hover:text-indigo-600 transition p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Share2 className="h-5 w-5" />
                    </button>
                </div>
            </motion.div>
        </div>

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <div className="h-[300px] md:h-[400px] w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-12 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                <span className="text-4xl font-bold opacity-20">Hero Image Placeholder</span>
            </div>

            <article className="prose prose-zinc dark:prose-invert lg:prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </article>

            <div className="mt-16 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center">
                <h3 className="text-xl font-bold mb-4">Enjoyed this post?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Subscribe to our newsletter to get the latest updates delivered straight to your inbox.
                </p>
                <div className="flex max-w-md mx-auto gap-2">
                    <input 
                        type="email" 
                        placeholder="Enter your email" 
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
                        Subscribe
                    </button>
                </div>
            </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
