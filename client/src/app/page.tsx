"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Zap, 
  Shield, 
  Globe, 
  MessageSquare, 
  BarChart3, 
  Code2, 
  Check, 
  ArrowRight,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-indigo-100 dark:bg-black dark:text-zinc-50 dark:selection:bg-indigo-900/30">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/80 backdrop-blur-md dark:border-zinc-800/50 dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/20">
              W
            </div>
            <span className="text-xl font-bold tracking-tight">WaaS</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="text-zinc-600 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">Features</Link>
            <Link href="#how-it-works" className="text-zinc-600 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">How it Works</Link>
            <Link href="#pricing" className="text-zinc-600 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">Pricing</Link>
            <Link href="#faq" className="text-zinc-600 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">FAQ</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Log in
            </Link>
            <Link 
              href="/register" 
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>

          <button 
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-zinc-200 bg-white px-6 py-4 md:hidden dark:border-zinc-800 dark:bg-zinc-900">
            <nav className="flex flex-col gap-4">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium">Features</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium">Pricing</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium">Log in</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Get Started</Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32">
          <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/20"></div>
          
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2 animate-pulse"></span>
                  v2.0 is now live
                </div>
                <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
                  Automate WhatsApp <br/>
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Like a Pro</span>
                </h1>
                <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
                  The most reliable self-hosted WhatsApp API gateway. Send messages, build chatbots, and manage campaigns without per-message fees.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 hover:scale-105 active:scale-95"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link 
                    href="#docs"
                    className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Read Documentation
                  </Link>
                </div>
                
                <div className="mt-8 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-zinc-200 dark:border-black dark:bg-zinc-800"></div>
                    ))}
                  </div>
                  <p>Trusted by 2,000+ developers</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative mx-auto w-full max-w-lg lg:max-w-none"
              >
                <div className="relative rounded-2xl bg-zinc-900 p-2 shadow-2xl ring-1 ring-zinc-100/10">
                  <div className="rounded-xl bg-black/90 p-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="text-xs font-mono text-zinc-500">api.waas.local</div>
                    </div>
                    <div className="mt-4 space-y-4 font-mono text-sm">
                      <div className="flex gap-2 text-zinc-400">
                        <span className="text-purple-400">$</span>
                        <span>curl -X POST https://api.waas/v1/messages \</span>
                      </div>
                      <div className="pl-4 text-zinc-400">
                        -H <span className="text-green-400">"Authorization: Bearer sk_..."</span> \
                      </div>
                      <div className="pl-4 text-zinc-400">
                        -d <span className="text-yellow-400">'{`{ "to": "+1234567890", "text": "Hello World!" }`}'</span>
                      </div>
                      <div className="text-green-400">
                        {`{ "id": "msg_123", "status": "sent" }`}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative blobs */}
                <div className="absolute -top-12 -right-12 -z-10 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl"></div>
                <div className="absolute -bottom-12 -left-12 -z-10 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Everything you need to build
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Powerful features designed for developers and businesses to scale their WhatsApp operations.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Zap className="h-6 w-6 text-indigo-600" />,
                  title: "Instant Delivery",
                  desc: "Optimized for speed. Messages are processed and delivered in milliseconds."
                },
                {
                  icon: <Shield className="h-6 w-6 text-indigo-600" />,
                  title: "Enterprise Security",
                  desc: "End-to-end encryption and secure data handling to keep your conversations private."
                },
                {
                  icon: <Code2 className="h-6 w-6 text-indigo-600" />,
                  title: "Developer API",
                  desc: "Clean, RESTful API with comprehensive documentation and SDKs."
                },
                {
                  icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
                  title: "Two-way Chat",
                  desc: "Receive messages via webhooks and reply instantly to your customers."
                },
                {
                  icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                  title: "Analytics Dashboard",
                  desc: "Track delivery rates, response times, and usage in real-time."
                },
                {
                  icon: <Globe className="h-6 w-6 text-indigo-600" />,
                  title: "Global Coverage",
                  desc: "Reach customers anywhere in the world with reliable uptime."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md dark:bg-zinc-900"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Choose the plan that fits your needs. No hidden fees.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                { name: "Basic", price: "Free", features: ["1 Session", "1 Agent", "1,000 Messages/mo", "Community Support"] },
                { name: "Silver", price: "$29", period: "/mo", popular: true, features: ["3 Sessions", "3 Agents", "10,000 Messages/mo", "Priority Support", "Webhooks"] },
                { name: "Premium", price: "$99", period: "/mo", features: ["Unlimited Sessions", "Unlimited Agents", "Unlimited Messages", "24/7 Dedicated Support", "Custom Integrations"] }
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.popular 
                      ? "border-indigo-600 shadow-xl ring-1 ring-indigo-600 dark:bg-zinc-900" 
                      : "border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{plan.name}</div>
                  <div className="mb-6 flex items-baseline text-zinc-900 dark:text-white">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-zinc-500">{plan.period}</span>}
                  </div>
                  <ul className="mb-8 flex-1 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="mr-3 h-4 w-4 text-indigo-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                      plan.popular
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    }`}
                  >
                    Get Started
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                { q: "Is it safe to use?", a: "Yes, we use end-to-end encryption and strictly follow security best practices. We do not store your message content permanently." },
                { q: "Can I use my own number?", a: "Absolutely. You can link any existing WhatsApp number by scanning a QR code, just like WhatsApp Web." },
                { q: "Do you offer a free trial?", a: "Yes, the Basic plan is completely free forever with limited limits so you can test the platform." },
                { q: "Is there an API limit?", a: "Limits depend on your plan. The Premium plan offers unlimited messaging throughput." }
              ].map((faq, i) => (
                <div key={i} className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{faq.q}</h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-indigo-600 px-6 py-24 text-center shadow-2xl sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to automate your communication?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-indigo-100">
                Join thousands of businesses using WaaS to connect with customers.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Link
                  href="/register"
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
                >
                  Get Started Now
                </Link>
              </div>
              
              {/* Decorative circles */}
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-500 opacity-50 blur-3xl"></div>
              <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 h-64 w-64 rounded-full bg-indigo-400 opacity-50 blur-3xl"></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white pt-16 pb-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">W</div>
                <span className="text-xl font-bold">WaaS</span>
              </div>
              <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
                The modern infrastructure for WhatsApp automation. Built for developers, by developers.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Product</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="#features" className="hover:text-indigo-600">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-indigo-600">Pricing</Link></li>
                <li><Link href="#docs" className="hover:text-indigo-600">Documentation</Link></li>
                <li><Link href="/changelog" className="hover:text-indigo-600">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Company</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/about" className="hover:text-indigo-600">About</Link></li>
                <li><Link href="/blog" className="hover:text-indigo-600">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-indigo-600">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-indigo-600">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-8 md:flex-row dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} WaaS Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
