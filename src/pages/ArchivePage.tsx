import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Archive as ArchiveIcon, Loader2, Unlock, Sparkles } from 'lucide-react';
import { ARCHIVE_WEEKS } from '../data/weeks';
import { fetchArchivedOfficialSets } from '../lib/sets';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { WeekSet } from '../lib/types';
import ProblemCard from '../components/ProblemCard';
import HallOfSolvers from '../components/HallOfSolvers';

interface Props {
  navigate: (to: string) => void;
  weekId?: string;
}

export default function ArchivePage({ navigate, weekId }: Props) {
  const [weeks, setWeeks] = useState<WeekSet[]>(ARCHIVE_WEEKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const db = await fetchArchivedOfficialSets();
      if (db.length > 0) setWeeks(db);
      setLoading(false);
    })();
  }, []);

  const sortedWeeks = useMemo(() => [...weeks].sort((a, b) => b.weekNumber - a.weekNumber), [weeks]);
  const selectedWeek = weekId ? sortedWeeks.find((w) => w.id === weekId) ?? null : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <ArchiveIcon className="mx-auto h-10 w-10 text-ink-500" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">No archived weeks yet</h2>
        <p className="mt-2 text-sm text-ink-400">
          Once a week's timer expires and the next bundle drops, it lands here with all official
          proofs permanently unlocked.
        </p>
      </div>
    );
  }

  if (weekId && !selectedWeek) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <button
          onClick={() => navigate('/archive')}
          className="focus-ring mb-6 inline-flex items-center gap-2 rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to archive
        </button>
        <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-8 text-center">
          <ArchiveIcon className="mx-auto h-10 w-10 text-ink-500" />
          <h2 className="mt-4 font-serif text-2xl text-ink-100">Archive bundle not found</h2>
          <p className="mt-2 text-sm text-ink-400">That week link does not exist in the archive.</p>
        </div>
      </div>
    );
  }

  if (selectedWeek) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              onClick={() => navigate('/archive')}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
            >
              <ArrowLeft className="h-4 w-4" /> Back to archive
            </button>
            <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">{selectedWeek.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-400">
              Archived bundle for week {selectedWeek.weekNumber}. Official proofs are permanently unlocked here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedWeeks.map((week) => (
              <button
                key={week.id}
                onClick={() => navigate(`/archive/${week.id}`)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  week.id === selectedWeek.id
                    ? 'border-accent-400 bg-accent-400/15 text-accent-200'
                    : 'border-ink-700 bg-ink-850/60 text-ink-300 hover:border-ink-600 hover:text-ink-100'
                }`}
              >
                Week {week.weekNumber}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-6">
          <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <span className="font-mono uppercase tracking-wider text-accent-300">{selectedWeek.umbrella || 'Weekly bundle'}</span>
              <span>·</span>
              <span>{new Date(selectedWeek.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-accent-300"><Unlock className="h-3 w-3" /> Unlocked archive</span>
            </div>
            <p className="mt-3 text-sm text-ink-300">{selectedWeek.description}</p>
          </div>

          <div className="space-y-4">
            {selectedWeek.problems.map((p) => (
              <ProblemCard key={p.id} problem={p} week={selectedWeek} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <ArchiveIcon className="h-3 w-3" />
          Archive · History Vault
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Past bundles</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Every past week, fully unlocked. Pick a bundle tab to open its own page with the official
          answers and proofs.
        </p>
      </header>

      <HallOfSolvers />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedWeeks.map((week) => (
          <button
            key={week.id}
            onClick={() => navigate(`/archive/${week.id}`)}
            className="group rounded-xl border border-ink-700 bg-ink-850/50 p-5 text-left transition hover:border-accent-400/30 hover:bg-ink-850"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Week {week.weekNumber}</div>
                <h3 className="mt-1 font-serif text-xl text-ink-50 group-hover:text-accent-200">{week.title}</h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-900 font-mono text-sm text-ink-300">
                {week.weekNumber}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-400">{week.description}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
              <Sparkles className="h-3.5 w-3.5 text-accent-300" />
              Open archived bundle
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
