"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Logo from "@/components/Logo";

// app/page.tsx
//
// Public landing page. The hero shows the actual transformation this app
// performs -- notes go in one side, flashcards come out the other -- and
// a short trust-pill row underneath grounds the claim in what's literally
// true about this implementation (local NLP, no external AI API).

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="min-h-screen flex flex-col">
      {/* ---- Top bar ---- */}
      <header className="max-w-5xl w-full mx-auto px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-2xl font-semibold tracking-tight">Recall</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-full hover:text-coral transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-5 py-2.5 rounded-full bg-ink text-paper hover:bg-coral transition-colors"
          >
            Sign up free
          </Link>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="flex-1 max-w-5xl w-full mx-auto px-5 pt-10 pb-12 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
            Your notes,
            <br />
            turned into{" "}
            <span className="relative inline-block">
              flashcards
              <svg
                className="absolute left-0 -bottom-2 w-full"
                height="10"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
              >
                <path d="M0,6 Q50,0 100,6 T200,6" stroke="#FF6B5B" strokeWidth="5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-md">
            Paste a paragraph of study notes. Recall reads it, finds what
            actually matters, and builds question-and-answer cards for you —
            then keeps showing you the ones you keep getting wrong.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3.5 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              Get started — it&apos;s free
            </Link>
            <Link href="/login" className="text-sm font-medium underline underline-offset-4 text-ink/60 hover:text-ink">
              I already have an account
            </Link>
          </div>

          {/* trust pills -- claims that are literally true about this build */}
          <div className="mt-7 flex flex-wrap gap-2">
            <Pill>Runs on local NLP</Pill>
            <Pill>No external AI API</Pill>
            <Pill>Spaced repetition built in</Pill>
          </div>
        </motion.div>

        {/* ---- Visual: notes paragraph morphing into a stack of cards ---- */}
        <motion.div
          className="relative h-80 sm:h-96"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="absolute left-0 top-4 w-56 bg-white rounded-xl shadow-pop p-4 rotate-[-4deg] border-2 border-ink/10">
            <p className="text-[11px] leading-relaxed text-ink/50 font-mono">
              Mitochondria are membrane-bound organelles found in most
              eukaryotic cells. They generate most of the cell&apos;s ATP...
            </p>
          </div>

          <div className="absolute right-2 top-0 w-48 bg-sunshine-light border-2 border-sunshine rounded-2xl p-4 shadow-card rotate-[5deg]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sunshine-dark">Q.</p>
            <p className="text-sm font-medium text-ink mt-1">
              What do mitochondria generate?
            </p>
          </div>

          <div className="absolute right-10 top-32 w-48 bg-mint-light border-2 border-mint rounded-2xl p-4 shadow-card rotate-[-3deg]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-mint-dark">A.</p>
            <p className="text-sm font-medium text-ink mt-1">Most of the cell&apos;s ATP</p>
          </div>

          <div className="absolute left-8 bottom-0 w-48 bg-coral-light border-2 border-coral rounded-2xl p-4 shadow-card rotate-[2deg]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-coral-dark">Q.</p>
            <p className="text-sm font-medium text-ink mt-1">
              Where are mitochondria found?
            </p>
          </div>
        </motion.div>
      </section>

      {/* ---- How it works ---- */}
      <section className="max-w-5xl w-full mx-auto px-5 pb-20">
        <h2 className="font-display text-2xl font-semibold mb-8">How Recall works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <FeatureCard
            color="sky"
            title="Paste your notes"
            text="Any paragraph, any subject. No formatting needed."
            delay={0}
          />
          <FeatureCard
            color="grape"
            title="NLP builds your cards"
            text="Real language processing finds key facts and writes questions for them — not just split sentences."
            delay={0.08}
          />
          <FeatureCard
            color="mint"
            title="Review what trips you up"
            text="Cards you mark Not Known come back more often, so weak spots get the practice they need."
            delay={0.16}
          />
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t-2 border-ink/8 py-6">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between text-sm text-ink/40">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span>Recall</span>
          </div>
          <span>Built for studying smarter, not longer.</span>
        </div>
      </footer>
    </main>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border-2 border-ink/10 text-ink/60">
      {children}
    </span>
  );
}

function FeatureCard({
  color,
  title,
  text,
  delay,
}: {
  color: "sky" | "grape" | "mint";
  title: string;
  text: string;
  delay: number;
}) {
  const bg = { sky: "bg-sky-light", grape: "bg-grape-light", mint: "bg-mint-light" }[color];
  const border = { sky: "border-sky", grape: "border-grape", mint: "border-mint" }[color];

  return (
    <motion.div
      className={`rounded-2xl border-2 ${border} ${bg} p-6`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
    >
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-ink/70 leading-relaxed">{text}</p>
    </motion.div>
  );
}
