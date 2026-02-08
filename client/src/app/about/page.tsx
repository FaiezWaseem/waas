"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Target, Heart, Globe, Award, Zap } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const team = [
  {
    name: "Faiez",
    role: "Founder & CEO",
    image: "/avatars/faiez.png", // Placeholder
    bio: "Full-stack developer with a passion for automation and scalable systems."
  },
  {
    name: "Sarah Johnson",
    role: "Head of Product",
    image: "/avatars/sarah.png",
    bio: "Ex-Google PM focused on building intuitive and user-centric products."
  },
  {
    name: "David Chen",
    role: "Lead Engineer",
    image: "/avatars/david.png",
    bio: "Rust enthusiast and distributed systems expert ensuring 99.99% uptime."
  },
  {
    name: "Emily Davis",
    role: "Customer Success",
    image: "/avatars/emily.png",
    bio: "Dedicated to helping our customers succeed and grow their businesses."
  }
];

const values = [
  {
    icon: Target,
    title: "Customer First",
    description: "We build what you need, not what we think is cool. Your success is our success."
  },
  {
    icon: Zap,
    title: "Speed & Reliability",
    description: "In the world of messaging, every millisecond counts. We optimize for speed."
  },
  {
    icon: Heart,
    title: "Transparency",
    description: "No hidden fees, no dark patterns. We believe in honest and open business."
  },
  {
    icon: Globe,
    title: "Global Scale",
    description: "Built to handle millions of messages across borders without breaking a sweat."
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/20"></div>
          <div className="mx-auto max-w-7xl px-6 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6"
            >
              We're on a mission to <br/>
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">simplify communication</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
            >
              WaaS was born out of frustration with complex and expensive WhatsApp APIs. We believe every business, small or large, deserves access to powerful automation tools.
            </motion.p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              {[
                { label: "Messages Sent", value: "10M+" },
                { label: "Active Users", value: "2,000+" },
                { label: "Uptime", value: "99.99%" },
                { label: "Countries", value: "50+" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</div>
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Our Values</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">The principles that guide everything we do.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {values.map((value, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-50 dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:shadow-lg transition-shadow"
                >
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Meet the Team</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">The people behind the platform.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {team.map((member, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="aspect-square bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                     {/* Placeholder for real images */}
                     <Users className="h-20 w-20 opacity-20" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg">{member.name}</h3>
                    <p className="text-indigo-600 text-sm font-medium mb-3">{member.role}</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                      {member.bio}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
