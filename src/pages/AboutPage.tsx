import { motion } from 'framer-motion';
import { Sparkles, Users, MessageCircle, ArrowRight, Mail } from 'lucide-react';

interface Props {
  navigate: (to: string) => void;
}

const DISCORD_URL = 'https://discord.gg/fzRghVuktQ';

export default function AboutPage({ navigate }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }}
        className="mb-10 text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
          <Sparkles className="h-3 w-3" />
          About
        </span>
        <h1 className="mt-5 font-serif text-4xl text-accent-300 sm:text-5xl">About ZeroSet</h1>
        <p className="mt-3 text-sm text-ink-300">
          A weekly home for original competition math — built by students, for students.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.1 }}
        whileHover={{ y: -4, scale: 1.01 }}
        className="group relative overflow-hidden rounded-2xl border border-accent-400/40 bg-ink-850/60 p-8 shadow-panel backdrop-blur-sm sm:p-10"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-400/15 blur-3xl transition-all duration-700 group-hover:bg-accent-400/25" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-400/50 bg-accent-400/15 font-serif text-xl font-bold text-accent-300">
              A.M
            </div>
            <div>
              <h2 className="font-serif text-2xl text-accent-200">A.M</h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-300">
                <Users className="h-3 w-3" /> Founder
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 border-t border-accent-400/30 pt-6">
          <p className="text-base leading-relaxed text-ink-100">
            A.M. founded ZeroSet with one goal: to make competition math feel fresh again. As a
            high school student, I wanted a place where students could solve original problems,
            challenge themselves each week, and be part of a growing community that enjoys
            mathematics as much as I do.
          </p>
        </div>
      </motion.div>

      {/* T.C — PR Manager */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.15 }}
        whileHover={{ y: -4, scale: 1.01 }}
        className="group relative mt-10 overflow-hidden rounded-2xl border border-accent-400/40 bg-ink-850/60 p-8 shadow-panel backdrop-blur-sm sm:p-10"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-400/15 blur-3xl transition-all duration-700 group-hover:bg-accent-400/25" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-400/50 bg-accent-400/15 font-serif text-xl font-bold text-accent-300">
              T.C
            </div>
            <div>
              <h2 className="font-serif text-2xl text-accent-200">T.C</h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-300">
                <Users className="h-3 w-3" /> PR Manager
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 border-t border-accent-400/30 pt-6">
          <p className="text-base leading-relaxed text-ink-100">
            Hey, my name is Tanvi! I am a high schooler who is ambitious to spread the joy of math. I also love all fields of science as well as learning music. I have participated in my school's robotics and science olympiad team for the past 6 years. In my free time I like to swim, craft, and hang out with my friends!
          </p>
        </div>
      </motion.div>

      {/* Contact email */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.25 }}
        className="mt-10 overflow-hidden rounded-2xl border border-accent-400/30 bg-ink-900/50 p-8 text-center shadow-panel sm:p-10"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/50 bg-accent-400/15 text-accent-300">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-serif text-2xl text-accent-200">Want to email us?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
          Questions, feedback, partnership ideas, or just want to say hi — drop us a line and we'll get back to you.
        </p>
        <a
          href="mailto:zerosetsupport@gmail.com"
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-400/30"
        >
          <Mail className="h-4 w-4" />
          zerosetsupport@gmail.com
        </a>
      </motion.div>

      {/* Join the team — Discord CTA */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.2 }}
        className="mt-10 overflow-hidden rounded-2xl border border-accent-400/40 bg-gradient-to-br from-accent-400/10 to-transparent p-8 text-center shadow-glow sm:p-10"
      >
        <div className="pointer-events-none mx-auto -mt-2 h-24 w-24 rounded-full bg-accent-400/15 blur-2xl" />
        <div className="relative">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/50 bg-accent-400/15 text-accent-300">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-serif text-2xl text-accent-200">Join the ZeroSet team</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
            Want to help build ZeroSet? We're always looking for problem writers, editors, and
            community builders. Click the link below to join our Discord and fill out the team
            application form.
          </p>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-400/30"
          >
            <MessageCircle className="h-4 w-4" />
            Join the Discord
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 break-all font-mono text-[10px] text-accent-300/70">{DISCORD_URL}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 80, damping: 20 }}
        className="mt-10 text-center"
      >
        <button
          onClick={() => navigate('/current-week')}
          className="btn-ink focus-ring rounded-md border border-accent-400 bg-accent-400/15 px-5 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
        >
          Try this week's bundle
        </button>
      </motion.div>
    </div>
  );
}
