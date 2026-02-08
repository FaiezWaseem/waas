"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white pt-16 pb-12 dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                W
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-white">WaaS</span>
            </Link>
            <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
              The modern infrastructure for WhatsApp automation. Built for developers, by developers.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Product</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#docs" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Company</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-8 md:flex-row dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} WaaS Inc. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
