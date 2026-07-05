import { ArrowRight, Calendar, Layers, Lock, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Props {
  navigate: (to: string) => void;
}

export default function LandingPage({ navigate }: Props) {
  const { isHost, user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/70 bg-grid bg-radial-accent">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
              <Sparkles className="h-3 w-3" />
              Weekly math, structured
            </span>
            <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[1.05] text-ink-50 sm:text-7xl">
              ZeroSet
            </h1>
            <p className="max-w-2xl text-lg text-ink-300 sm:text-xl">
              Every Sunday night: a fresh bundle of five math problems under one umbrella topic,
              with a steep difficulty climb from accessible to Olympiad. You have one week. Submit
              your own solutions. When the timer hits zero, the official proofs unlock.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/')}
                className="focus-ring group flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-5 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
              >
                Open this week's bundle
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate('/community')}
                className="focus-ring rounded-md border border-ink-700 px-5 py-2.5 text-sm text-ink-200 transition hover:border-ink-600 hover:text-ink-100"
              >
                Browse community sets
              </button>
              {isHost && (
                <button
                  onClick={() => navigate('/host')}
                  className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400/40 bg-accent-400/5 px-4 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/15"
                >
                  <Layers className="h-4 w-4" />
                  Host dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <h2 className="font-serif text-3xl text-ink-50 sm:text-4xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            A weekly cadence with a hard deadline and a hard lock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            icon={<Calendar className="h-5 w-5" />}
            title="Sunday night drop"
            body="A new bundle of five problems goes live every Sunday night, each under a single cohesive umbrella topic."
          />
          <Card
            icon={<Lock className="h-5 w-5" />}
            title="One week, locked answers"
            body="You have until the next Sunday night to submit. Official answers and proofs are blurred and inaccessible until the timer hits zero."
          />
          <Card
            icon={<Sparkles className="h-5 w-5" />}
            title="Steep difficulty climb"
            body="Problem 1 is accessible. Problem 5 is Olympiad/Putnam level. Each one ties conceptually into the previous."
          />
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-ink-700/70 bg-ink-950/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h3 className="font-serif text-2xl text-ink-50">Submit, then see the community</h3>
              <p className="mt-3 text-sm text-ink-300">
                Below each problem, a clean Markdown + LaTeX editor. You can't peek at other
                people's solutions until you've submitted your own attempt. Edit or delete your
                submission any time before the reveal.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink-50">Archive, permanently unlocked</h3>
              <p className="mt-3 text-sm text-ink-300">
                Once a week's timer expires, the set moves to the archive. No countdown, no blur —
                read the official proofs at your own pace, forever.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink-50">Nested forum, LaTeX-native</h3>
              <p className="mt-3 text-sm text-ink-300">
                Threaded discussion by topic — Olympiad Prep, Calculus & Analysis, Discrete Math,
                Algebra, Site Feedback. The forum editor renders inline and block math just like
                the problem statements.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink-50">Run your own weekly bundle</h3>
              <p className="mt-3 text-sm text-ink-300">
                Anyone can create a Community Set — a recurring weekly problem bundle under your
                own brand. Same difficulty-climb structure, same one-week lock, your own problems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-serif text-3xl text-ink-50 sm:text-4xl">Ready to climb?</h2>
        <p className="mt-3 text-sm text-ink-400">
          {user
            ? 'Jump into this week’s bundle, or browse what the community is building.'
            : 'Sign in to submit solutions, join the forum, or publish your own weekly set.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="focus-ring flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-5 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            This week's bundle <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/forum')}
            className="focus-ring flex items-center gap-2 rounded-md border border-ink-700 px-5 py-2.5 text-sm text-ink-200 transition hover:border-ink-600 hover:text-ink-100"
          >
            <MessageSquare className="h-4 w-4" /> Forum
          </button>
          <button
            onClick={() => navigate('/community')}
            className="focus-ring flex items-center gap-2 rounded-md border border-ink-700 px-5 py-2.5 text-sm text-ink-200 transition hover:border-ink-600 hover:text-ink-100"
          >
            <Users className="h-4 w-4" /> Community sets
          </button>
        </div>
      </section>
    </div>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group rounded-xl border border-ink-700 bg-ink-850/50 p-5 transition hover:border-accent-400/30 hover:bg-ink-850">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-accent-400/30 bg-accent-400/10 text-accent-300">
        {icon}
      </div>
      <h3 className="font-serif text-lg text-ink-50">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-400">{body}</p>
    </div>
  );
}
