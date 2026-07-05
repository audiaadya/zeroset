import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Layers, Loader2, Sparkles } from 'lucide-react';
import { CURRENT_WEEK, isWeekUnlocked } from '../data/weeks';
import { fetchCurrentOfficialSet } from '../lib/sets';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { WeekSet } from '../lib/types';
import CountdownTimer from '../components/CountdownTimer';
import ProblemCard from '../components/ProblemCard';

interface Props {
  navigate: (to: string) => void;
}

export default function HomePage({ navigate }: Props) {
  const [week, setWeek] = useState<WeekSet>(CURRENT_WEEK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const db = await fetchCurrentOfficialSet();
      if (db) setWeek(db);
      setLoading(false);
    })();
  }, []);

  const unlocked = isWeekUnlocked(week);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/70 bg-grid bg-radial-accent">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading this week's bundle…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
                <Sparkles className="h-3 w-3" />
                {week.weekNumber ? `Week ${week.weekNumber}` : 'This week'} · {week.umbrella || 'Weekly bundle'}
              </span>
              <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink-50 sm:text-5xl">
                {week.title}
              </h1>
              <p className="max-w-2xl text-base text-ink-300 sm:text-lg">{week.description}</p>
            </div>
          )}

          {!loading && (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-400">
                  <Calendar className="h-3.5 w-3.5 text-accent-400" />
                  Published
                </div>
                <div className="mt-1.5 font-mono text-sm text-ink-100">
                  {new Date(week.publishDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-400">
                  <Layers className="h-3.5 w-3.5 text-accent-400" />
                  Problems
                </div>
                <div className="mt-1.5 font-mono text-sm text-ink-100">
                  {week.problems.length} · difficulty climb I → V
                </div>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-400">
                  <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                  Reveal
                </div>
                <div className="mt-1.5 font-mono text-sm text-ink-100">
                  {new Date(week.revealDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Countdown + problems */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-ink-50">This week's bundle</h2>
            <p className="mt-1 text-sm text-ink-400">
              Five problems, one umbrella topic, a steep climb. Submit your own solutions; official
              proofs unlock when the timer hits zero.
            </p>
          </div>
          <CountdownTimer target={week.revealDate} />
        </div>

        <div className="space-y-6">
          {week.problems.map((p) => (
            <ProblemCard key={p.id} problem={p} week={week} />
          ))}
        </div>

        {unlocked && (
          <div className="mt-8 rounded-lg border border-accent-400/30 bg-accent-400/5 p-4 text-sm text-ink-300">
            This week's answers are now unlocked. The set will move to the{' '}
            <button
              onClick={() => navigate('/archive')}
              className="text-accent-300 underline-offset-2 hover:underline"
            >
              archive
            </button>{' '}
            when the next bundle drops.
          </div>
        )}

        <div className="mt-10 flex flex-col items-start gap-3 rounded-lg border border-ink-700 bg-ink-850/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-lg text-ink-50">Browse past bundles</h3>
            <p className="mt-1 text-sm text-ink-400">
              Past weeks have their official proofs permanently unlocked.
            </p>
          </div>
          <button
            onClick={() => navigate('/archive')}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 transition hover:border-accent-400/40 hover:text-accent-200"
          >
            Open archive <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
