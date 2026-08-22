import { motion } from 'framer-motion';
import { Sparkles, Users, MessageCircle, ArrowRight, Mail, Heart } from 'lucide-react';

interface Props {
  navigate: (to: string) => void;
}

const DISCORD_URL = 'https://discord.gg/fzRghVuktQ';

export default function AboutPage({ navigate }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 pt-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }}
        className="mb-10 text-center"
      >
        <span className="inline-flex items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
          <Sparkles className="h-3.5 w-3.5" />
          Get Involved
        </span>
        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-handwritten text-4xl font-bold text-ink-950 sm:text-5xl">About ZeroSet</h1>
            <p className="mt-3 font-handwritten text-sm text-ink-700">
              A weekly home for original competition math — built by students, for students.
            </p>
          </div>
          <a
            href="https://hcb.hackclub.com/donations/start/zeroset"
            target="_blank"
            rel="noreferrer"
            className="btn-sketch-notebook flex shrink-0 items-center gap-2 px-5 py-2.5 font-handwritten text-sm font-bold text-red-600"
          >
            <Heart className="h-4 w-4" />
            Donate
          </a>
        </div>
      </motion.div>

      {/* Donate section — first thing on the page */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.1 }}
        className="mb-10 overflow-hidden border-2 border-red-500 bg-red-50 p-8 text-center shadow-panel sm:p-12"
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-red-500 bg-cream-100 text-red-600" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
          <Heart className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-handwritten text-4xl font-bold text-red-700 sm:text-5xl">Donate to ZeroSet</h2>
        <p className="mx-auto mt-4 max-w-2xl font-handwritten text-lg leading-relaxed text-ink-900">
          ZeroSet is a registered 501(c)(3) nonprofit organization. Every dollar you give helps us
          keep the platform free, commission original problems, and reach more students. All
          donations are tax-exempt — you'll receive a receipt for your records.
        </p>
        <a
          href="https://hcb.hackclub.com/donations/start/zeroset"
          target="_blank"
          rel="noreferrer"
          className="btn-sketch-notebook mt-8 inline-flex items-center gap-2 border-2 border-red-500 px-8 py-3 font-handwritten text-lg font-bold text-red-600 transition hover:bg-red-100"
        >
          <Heart className="h-5 w-5" />
          Donate to ZeroSet
        </a>
        <p className="mt-4 font-handwritten text-xs text-ink-600">
          501(c)(3) nonprofit · All donations are tax-exempt
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.15 }}
        className="group relative overflow-hidden border-2 border-ink-700 bg-cream-100 p-8 shadow-panel sm:p-10"
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center border-2 border-accent-500 bg-accent-50 font-handwritten text-xl font-bold text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
              A.M
            </div>
            <div>
              <h2 className="font-handwritten text-2xl font-bold text-ink-950">A.M</h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
                <Users className="h-3 w-3" /> Founder
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 border-t border-ink-300 pt-6">
          <p className="font-handwritten text-base leading-relaxed text-ink-900">
            My name is Aadya, and I founded ZeroSet with a passion to make structured math practice.
            There are a multitude of free resources on the internet, but students can't seem to get
            started because of the staggering amount of content they need to finish. Competition
            math often seems overwhelming, and too much at once. That's why we create weekly problem
            sets that systematically increase in difficulty, so students feel like they're actually
            building off of concepts they already know, instead of memorizing formulas.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.15 }}
        className="group relative mt-10 overflow-hidden border-2 border-ink-700 bg-cream-100 p-8 shadow-panel sm:p-10"
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center border-2 border-accent-500 bg-accent-50 font-handwritten text-xl font-bold text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
              T.C
            </div>
            <div>
              <h2 className="font-handwritten text-2xl font-bold text-ink-950">T.C</h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
                <Users className="h-3 w-3" /> PR Manager
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 border-t border-ink-300 pt-6">
          <p className="font-handwritten text-base leading-relaxed text-ink-900">
            Hey, my name is Tanvi! I am a high schooler who is ambitious to spread the joy of math. I also love all fields of science as well as learning music. I have participated in my school's robotics and science olympiad team for the past 6 years. In my free time I like to swim, craft, and hang out with my friends!
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.25 }}
        className="mt-10 overflow-hidden border-2 border-ink-700 bg-cream-100 p-8 text-center shadow-panel sm:p-10"
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-accent-500 bg-accent-50 text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">Want to email us?</h2>
        <p className="mx-auto mt-2 max-w-md font-handwritten text-sm text-ink-700">
          Questions, feedback, partnership ideas, or just want to say hi — drop us a line and we'll get back to you.
        </p>
        <a
          href="mailto:zerosetsupport@gmail.com"
          className="btn-sketch-notebook mt-6 inline-flex items-center gap-2 px-5 py-2.5 font-handwritten text-sm font-bold"
        >
          <Mail className="h-4 w-4" />
          zerosetsupport@gmail.com
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 1.1, delay: 0.2 }}
        className="mt-10 overflow-hidden border-2 border-accent-500 bg-accent-50 p-8 text-center shadow-glow sm:p-10"
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <div className="relative">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-accent-500 bg-cream-100 text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">Join the ZeroSet team</h2>
          <p className="mx-auto mt-2 max-w-md font-handwritten text-sm text-ink-700">
            Want to help build ZeroSet? We're always looking for problem writers, editors, and
            community builders. Click the link below to join our Discord and fill out the team
            application form.
          </p>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-sketch-notebook mt-6 inline-flex items-center gap-2 px-5 py-2.5 font-handwritten text-sm font-bold"
          >
            <MessageCircle className="h-4 w-4" />
            Join the Discord
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 break-all font-mono text-[10px] text-accent-700/70">{DISCORD_URL}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 80, damping: 20 }}
        className="mt-10 text-center"
      >
        <button
          onClick={() => navigate('/')}
          className="btn-sketch-notebook px-5 py-2.5 font-handwritten text-sm font-bold"
        >
          Try this week's bundle
        </button>
      </motion.div>
    </div>
  );
}
