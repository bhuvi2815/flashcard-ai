"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Logo from "./Logo";

// components/AuthSplitLayout.tsx
//
// Shared shell for the signup and login pages: a brand panel on the left
// (hidden on small screens) with a gentle floating-cards animation, and
// the actual form rendered as `children` on the right. This split-screen
// pattern is what makes an auth page read as a real product rather than
// a bare centered form -- it's the single highest-impact visual change
// for "does this look legit" first impressions.

export default function AuthSplitLayout({
  headline,
  children,
}: {
  headline: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* ---- Left: brand panel (hidden below md breakpoint) ---- */}
      <div className="hidden md:flex relative flex-col justify-between bg-ink text-paper p-10 overflow-hidden">
        {/* faint dotted texture, matches the paper background elsewhere */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, #FBF6EC 1px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-xl font-semibold tracking-tight">Recall</span>
        </Link>

        <div className="relative z-10">
          <h2 className="font-display text-3xl font-semibold leading-tight max-w-sm">
            {headline}
          </h2>

          {/* floating mini flashcards -- gentle ambient motion, disabled
              entirely for users who prefer reduced motion */}
          <div className="relative h-56 mt-10">
            <motion.div
              className="absolute left-0 top-6 w-44 bg-sky-light border-2 border-sky rounded-2xl p-4 shadow-pop"
              initial={{ opacity: 0, y: 12 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, y: [0, -8, 0] }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.5 }
                  : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-dark">Q.</p>
              <p className="text-sm font-medium text-ink mt-1">What absorbs light energy?</p>
            </motion.div>

            <motion.div
              className="absolute right-2 top-20 w-44 bg-mint-light border-2 border-mint rounded-2xl p-4 shadow-pop"
              initial={{ opacity: 0, y: 12 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, y: [0, 8, 0] }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.5, delay: 0.1 }
                  : { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mint-dark">A.</p>
              <p className="text-sm font-medium text-ink mt-1">Chlorophyll</p>
            </motion.div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-paper/50">
          Local NLP &amp; question-generation — no external AI API calls.
        </p>
      </div>

      {/* ---- Right: the actual form ---- */}
      <div className="flex items-center justify-center px-5 py-12 bg-paper">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* logo shown only on mobile, since the brand panel is hidden there */}
          <Link href="/" className="flex md:hidden items-center gap-2.5 mb-8 justify-center">
            <Logo size={28} />
            <span className="font-display text-xl font-semibold tracking-tight">Recall</span>
          </Link>

          {children}
        </motion.div>
      </div>
    </main>
  );
}
