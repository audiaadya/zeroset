import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Clock,
  Crown,
  Flame,
  Layers,
  Loader2,
  Lock,
  Network,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { CURRENT_WEEK, isWeekUnlocked } from '../data/weeks';
import { fetchCurrentOfficialSet } from '../lib/sets';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { WeekSet } from '../lib/types';
import CountdownTimer from '../components/CountdownTimer';
import ProblemCard from '../components/ProblemCard';
import MockSimulator from '../components/MockSimulator';
import CommunitySpotlight from '../components/CommunitySpotlight';

interface Props {
  navigate: (to: string) => void;
}

export default function HomePage({ navigate }: Props) {
  const [week, setWeek] = useState<WeekSet>(CURRENT_WEEK);
  const [loading, setLoading] = useState(true);
  const [mockMode, setMockMode] = useState(false);

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
      <section className="relative overflow-hidden border-b border-accent-400/30 bg-grid bg-radial-accent">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
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
              <h1 className="max-w-3xl font-serif text-3xl italic font-medium leading-tight text-ink-50 sm:text-4xl">
                {week.title}
              </h1>
              <p className="max-w-2xl text-sm text-ink-300 sm:text-base">{week.description}</p>
            </div>
          )}

          {!loading && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-accent-400/30 bg-accent-400/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-300">
                  <Calendar className="h-3 w-3" />
                  Published
                </div>
                <div className="mt-1 font-mono text-sm text-ink-50">
                  {new Date(week.publishDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-accent-400/30 bg-accent-400/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-300">
                  <Layers className="h-3 w-3" />
                  Problems
                </div>
                <div className="mt-1 font-mono text-sm text-ink-50">
                  {week.problems.length} · difficulty climb I → V
                </div>
              </div>
              <div className="rounded-lg border border-accent-400/30 bg-accent-400/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-300">
                  <Clock className="h-3 w-3" />
                  Reveal
                </div>
                <div className="mt-1 font-mono text-sm text-ink-50">
                  <CountdownTimer target={week.revealDate} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Current Week Problems */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-ink-50">This week's problems</h2>
            <p className="mt-1 text-sm text-ink-400">
              Five problems, one umbrella topic, a steep climb. Submit your own solutions; official proofs unlock when the timer hits zero.
            </p>
          </div>
          <button
            onClick={() => setMockMode(!mockMode)}
            className={`focus-ring flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition ${
              mockMode
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border-ink-700 text-ink-400 hover:border-accent-400/40 hover:text-accent-200'
            }`}
          >
            <Zap className="h-3 w-3" />
            {mockMode ? 'Exit Mock Mode' : 'Mock Simulator'}
          </button>
        </div>

        {mockMode ? (
          <MockSimulator problems={week.problems} week={week} onComplete={() => setMockMode(false)} />
        ) : (
          <div className="space-y-4">
            {week.problems.map((p) => (
              <ProblemCard key={p.id} problem={p} week={week} />
            ))}
          </div>
        )}

        {unlocked && (
          <div className="mt-6 rounded-lg border border-accent-400/30 bg-accent-400/5 p-3 text-sm text-ink-300">
            <Lock className="mr-1.5 inline h-3.5 w-3.5 text-accent-400" />
            This week's answers are now unlocked. The set will move to the{' '}
            <button onClick={() => navigate('/archive')} className="text-accent-300 underline-offset-2 hover:underline">
              archive
            </button>{' '}
            when the next bundle drops.
          </div>
        )}
      </section>

      {/* Community spotlight — trending + staff pick */}
      <CommunitySpotlight navigate={navigate} />

      {/* Quick Stats */}
      <section className="border-y border-accent-400/30 bg-accent-400/5">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatButton icon={<TrendingUp className="h-5 w-5" />} label="XP & Levels" value="Climb forever" onClick={() => navigate('/me')} />
            <StatButton icon={<Flame className="h-5 w-5" />} label="Weekly Streaks" value="Don't break the chain" onClick={() => navigate('/me')} />
            <StatButton icon={<Crown className="h-5 w-5" />} label="Badges" value="9 to earn" onClick={() => navigate('/me')} />
            <StatButton icon={<Target className="h-5 w-5" />} label="Sudden Death" value="1.5x multiplier" onClick={() => navigate('/sudden-death')} />
          </div>
        </div>
      </section>

      {/* Games & Extras */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h2 className="font-serif text-2xl text-ink-50">Games & Extras</h2>
          <p className="mt-1 text-sm text-ink-400">Challenge yourself beyond the weekly sets.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <GameCard
            icon={<Zap className="h-5 w-5" />}
            title="Sudden Death"
            desc="One shot per problem. Get it right for 1.5x points on the leaderboard."
            onClick={() => navigate('/sudden-death')}
          />
          <GameCard
            icon={<Network className="h-5 w-5" />}
            title="Skill Tree"
            desc="Unlock advanced topics by completing prerequisites."
            onClick={() => navigate('/skill-tree')}
          />
          <GameCard
            icon={<Target className="h-5 w-5" />}
            title="Bounty Board"
            desc="Hunt flaws in fake proofs for massive XP rewards."
            onClick={() => navigate('/bounty')}
          />
        </div>
      </section>

      {/* Archive CTA */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-accent-400/30 bg-accent-400/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-lg italic text-ink-50">Browse past bundles</h3>
            <p className="mt-1 text-sm text-ink-600">Official proofs permanently unlocked.</p>
          </div>
          <button
            onClick={() => navigate('/archive')}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400/40 px-4 py-2 text-sm text-accent-500 transition hover:border-accent-400 hover:bg-accent-400/10"
          >
            Open archive <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
        <Trophy className="mx-auto h-8 w-8 text-amber-400" />
        <h2 className="mt-4 font-serif text-2xl italic text-ink-50">Ready to climb?</h2>
        <p className="mt-2 text-sm text-ink-400">Sign in to submit solutions and earn your first badge.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/skill-tree')}
            className="focus-ring flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            <Network className="h-4 w-4" /> Start climbing
          </button>
          <button
            onClick={() => navigate('/sudden-death')}
            className="focus-ring flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
          >
            <Zap className="h-4 w-4" /> Sudden Death
          </button>
        </div>
      </section>
    </div>
  );
}

function StatButton({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring group rounded-lg border border-accent-400/30 bg-graph-paper p-4 text-left transition hover:border-accent-400/60 hover:bg-accent-400/10"
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-400">
        <span className="text-accent-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-800">{value}</div>
    </button>
  );
}

function GameCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring group flex items-start gap-4 rounded-xl border border-accent-400/30 bg-accent-400/5 p-5 text-left transition hover:border-accent-400/60 hover:bg-accent-400/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent-400/40 bg-accent-400/10 text-accent-400">
        {icon}
      </div>
      <div>
        <h3 className="font-serif text-base text-ink-50 group-hover:text-accent-400">{title}</h3>
        <p className="mt-1 text-xs text-ink-600">{desc}</p>
      </div>
    </button>
  );
}
