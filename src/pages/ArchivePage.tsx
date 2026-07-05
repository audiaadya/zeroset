import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Unlock, Archive as ArchiveIcon, Loader2 } from 'lucide-react';
import { ARCHIVE_WEEKS } from '../data/weeks';
import { fetchArchivedOfficialSets } from '../lib/sets';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { WeekSet } from '../lib/types';
import ProblemCard from '../components/ProblemCard';

export default function ArchivePage() {
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

  const [openId, setOpenId] = useState<string | null>(weeks[0]?.id ?? null);

  useEffect(() => {
    if (weeks.length > 0 && !weeks.find((w) => w.id === openId)) {
      setOpenId(weeks[0].id);
    }
  }, [weeks, openId]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <ArchiveIcon className="h-3 w-3" />
          Archive · History Vault
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Past bundles</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Every past week, fully unlocked. No countdown, no blur — read the official answers and
          proofs at your own pace.
        </p>
      </header>

      <div className="space-y-4">
        {weeks.map((w) => (
          <ArchiveRow key={w.id} week={w} open={openId === w.id} onToggle={() => setOpenId(openId === w.id ? null : w.id)} />
        ))}
      </div>
    </div>
  );
}

function ArchiveRow({ week, open, onToggle }: { week: WeekSet; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850/50">
      <button
        onClick={onToggle}
        className="focus-ring flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-ink-850"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-900 font-mono text-sm text-ink-300">
            W{week.weekNumber || '?'}
          </div>
          <div>
            <h3 className="font-serif text-lg text-ink-50">{week.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
              {week.umbrella && (
                <>
                  <span className="font-mono uppercase tracking-wider text-accent-300">{week.umbrella}</span>
                  <span>·</span>
                </>
              )}
              <span>
                {new Date(week.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-accent-300">
                <Unlock className="h-3 w-3" /> proofs unlocked
              </span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-ink-400" /> : <ChevronDown className="h-5 w-5 text-ink-400" />}
      </button>

      {open && (
        <div className="space-y-6 border-t border-ink-700 bg-ink-900/40 p-5">
          <p className="text-sm text-ink-300">{week.description}</p>
          {week.problems.map((p) => (
            <ProblemCard key={p.id} problem={p} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}
