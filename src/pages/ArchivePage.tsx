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
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-600" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <ArchiveIcon className="mx-auto h-10 w-10 text-ink-500" />
        <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">No archived weeks yet</h2>
        <p className="mt-2 font-handwritten text-sm text-ink-700">
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
          className="btn-sketch-notebook mb-6 inline-flex items-center gap-2 px-3 py-1.5 font-handwritten text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to archive
        </button>
        <div className="sketch-border bg-cream-100 p-8 text-center">
          <ArchiveIcon className="mx-auto h-10 w-10 text-ink-500" />
          <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">Archive bundle not found</h2>
          <p className="mt-2 font-handwritten text-sm text-ink-700">That week link does not exist in the archive.</p>
        </div>
      </div>
    );
  }

  if (selectedWeek) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 pt-24 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              onClick={() => navigate('/archive')}
              className="btn-sketch-notebook inline-flex items-center gap-2 px-3 py-1.5 font-handwritten text-sm font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to archive
            </button>
            <h1 className="mt-4 font-handwritten text-3xl font-bold text-ink-950 sm:text-4xl">{selectedWeek.title}</h1>
            <p className="mt-2 max-w-2xl font-handwritten text-sm text-ink-700">
              Archived bundle for week {selectedWeek.weekNumber}. Official proofs are permanently unlocked here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedWeeks.map((week) => (
              <button
                key={week.id}
                onClick={() => navigate(`/archive/${week.id}`)}
                className={`border-2 px-3 py-1.5 font-handwritten text-xs font-bold transition ${
                  week.id === selectedWeek.id
                    ? 'border-accent-500 bg-accent-50 text-accent-700'
                    : 'border-ink-400 bg-cream-100 text-ink-700 hover:border-accent-400 hover:text-accent-700'
                }`}
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              >
                Week {week.weekNumber}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-6">
          <div className="sketch-border-sm bg-cream-100 p-5">
            <div className="flex flex-wrap items-center gap-2 font-handwritten text-xs text-ink-700">
              <span className="highlighter font-bold uppercase tracking-wider text-accent-700">{selectedWeek.umbrella || 'Weekly bundle'}</span>
              <span>·</span>
              <span>{new Date(selectedWeek.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span className="flex items-center gap-1 font-bold text-accent-700"><Unlock className="h-3 w-3" /> Unlocked archive</span>
            </div>
            <p className="mt-3 font-handwritten text-sm text-ink-800">{selectedWeek.description}</p>
          </div>

          <div className="space-y-4">
            {selectedWeek.problems.map((p, i) => (
              <ProblemCard key={p.id} problem={p} week={selectedWeek} climbIndex={i} totalClimb={selectedWeek.problems.length} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 pt-24 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
          <ArchiveIcon className="h-3.5 w-3.5" />
          Archive · History Vault
        </span>
        <h1 className="mt-4 font-handwritten text-3xl font-bold text-ink-950 sm:text-4xl">Past bundles</h1>
        <p className="mt-2 max-w-2xl font-handwritten text-sm text-ink-700">
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
            className="group sketch-border bg-cream-100 p-5 text-left transition hover:border-accent-500 hover:bg-cream-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-handwritten text-xs font-bold uppercase tracking-wider text-ink-600">Week {week.weekNumber}</div>
                <h3 className="mt-1 font-handwritten text-xl font-bold text-ink-950 group-hover:text-accent-700">{week.title}</h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center border-2 border-ink-400 bg-cream-50 font-handwritten text-sm font-bold text-ink-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
                {week.weekNumber}
              </div>
            </div>
            <p className="mt-3 font-handwritten text-sm text-ink-700">{week.description}</p>
            <div className="mt-4 flex items-center gap-2 font-handwritten text-xs text-ink-600">
              <Sparkles className="h-3.5 w-3.5 text-accent-600" />
              Open archived bundle
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
