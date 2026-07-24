import { useEffect, useState } from 'react';
import { AlertCircle, Edit3, Loader2, Save, Send, X, ArrowLeft, Trash2, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import { fetchCommunitySet } from '../lib/sets';
import type { DbProblem, DbWeekSet, Difficulty, WeekSet } from '../lib/types';
import ProblemCard from '../components/ProblemCard';
import CountdownTimer from '../components/CountdownTimer';

interface Props {
  setId: string;
  navigate: (to: string) => void;
}

const DIFFICULTIES: Difficulty[] = ['Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad'];

function toLocalInput(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

export default function CommunitySetPage({ setId, navigate }: Props) {
  const { user, configured, isHost } = useAuth();
  const [set, setSet] = useState<WeekSet | null>(null);
  const [raw, setRaw] = useState<{ ws: DbWeekSet; problems: DbProblem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [staffPick, setStaffPick] = useState(false);
  const [togglingPick, setTogglingPick] = useState(false);

  const load = async () => {
    setLoading(true);
    const s = await fetchCommunitySet(setId);
    setSet(s);
    // Also fetch raw for owner-edit check
    const { data } = await supabase
      .from('week_sets')
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at, staff_pick')
      .eq('id', setId)
      .maybeSingle();
    if (data) {
      const ws = data as DbWeekSet & { staff_pick?: boolean };
      setStaffPick(Boolean(ws.staff_pick));
      const { data: probs } = await supabase
        .from('problems')
        .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
        .eq('set_id', setId)
        .order('index', { ascending: true });
      setRaw({ ws, problems: (probs as DbProblem[]) ?? [] });
      // Bump trending score for non-owners viewing a published community set.
      if (ws.scope === 'community' && ws.status === 'published' && user && ws.owner_id !== user.id) {
        void supabase.rpc('bump_trending_score', { p_set_id: setId }).then(({ error }) => {
          if (error) {
            // Fallback: direct update if the RPC isn't available.
            void supabase
              .from('week_sets')
              .update({ trending_score: (ws as { trending_score?: number }).trending_score ?? 0 + 1 })
              .eq('id', setId);
          }
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, configured]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-serif text-2xl text-ink-100">Set not found</h2>
        <p className="mt-2 text-sm text-ink-400">It may not be published yet, or the link is wrong.</p>
        <button onClick={() => navigate('/community')} className="mt-4 text-sm text-accent-300 hover:underline">
          Back to community sets
        </button>
      </div>
    );
  }

  const isOwner = raw?.ws.owner_id === user?.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <button
        onClick={() => navigate('/community')}
        className="focus-ring mb-4 flex items-center gap-1.5 text-xs text-ink-400 hover:text-accent-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All community sets
      </button>

      <header className="mb-8">
        {set.umbrella && (
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            {set.umbrella}
          </span>
        )}
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">{set.title}</h1>
        {set.description && <p className="mt-2 max-w-2xl text-sm text-ink-300">{set.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
          <span className="font-mono text-accent-300">{raw?.ws.owner_name ?? 'community'}</span>
          {raw?.ws.status === 'draft' && <span className="text-amber-300">· draft</span>}
        </div>
      </header>

      {isOwner && raw && (
        <div className="mb-6">
          <button
            onClick={() => setEditing(true)}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit set
          </button>
        </div>
      )}

      {isHost && raw?.ws.scope === 'community' && raw?.ws.status === 'published' && (
        <div className="mb-6">
          <button
            onClick={async () => {
              setTogglingPick(true);
              const next = !staffPick;
              const { error } = await supabase
                .from('week_sets')
                .update({ staff_pick: next })
                .eq('id', setId);
              if (!error) setStaffPick(next);
              setTogglingPick(false);
            }}
            disabled={togglingPick}
            className={`focus-ring flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              staffPick
                ? 'border-accent-400 bg-accent-400/20 text-accent-200'
                : 'border-ink-700 text-ink-200 hover:border-accent-400/40 hover:text-accent-200'
            }`}
          >
            {togglingPick ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star className={`h-3.5 w-3.5 ${staffPick ? 'fill-accent-400 text-accent-400' : ''}`} />
            )}
            {staffPick ? 'Staff pick' : 'Mark as staff pick'}
          </button>
        </div>
      )}

      {new Date(set.revealDate).getTime() > Date.now() && (
        <div className="mb-6">
          <CountdownTimer target={set.revealDate} />
        </div>
      )}

      <div className="space-y-6">
        {set.problems.map((p) => (
          <ProblemCard key={p.id} problem={p} week={set} />
        ))}
      </div>

      {isOwner && raw && editing && (
        <EditSetModal
          initial={raw.ws}
          initialProblems={raw.problems}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EditSetModal({
  initial,
  initialProblems,
  onClose,
  onSaved,
}: {
  initial: DbWeekSet;
  initialProblems: DbProblem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const displayName = useDisplayName();
  const [title, setTitle] = useState(initial.title);
  const [umbrella, setUmbrella] = useState(initial.umbrella ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [publishAt, setPublishAt] = useState(initial.publish_at ? toLocalInput(new Date(initial.publish_at)) : '');
  const [revealAt, setRevealAt] = useState(initial.reveal_at ? toLocalInput(new Date(initial.reveal_at)) : '');
  const [problems, setProblems] = useState<DbProblem[]>(initialProblems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProblem = (i: number, patch: Partial<DbProblem>) => {
    setProblems((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const save = async (publish: boolean) => {
    if (!user) return;
    if (title.trim().length < 3) {
      setError('Add a title.');
      return;
    }
    if (publish && problems.some((p) => p.statement.trim().length < 5)) {
      setError('Every problem needs a statement before publishing.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: wse } = await supabase
      .from('week_sets')
      .update({
        title: title.trim(),
        umbrella: umbrella.trim(),
        description: description.trim(),
        publish_at: publishAt ? fromLocalInput(publishAt) : null,
        reveal_at: revealAt ? fromLocalInput(revealAt) : null,
        status: publish ? 'published' : 'draft',
        owner_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', initial.id);
    if (wse) {
      setError(wse.message);
      setBusy(false);
      return;
    }
    for (const p of problems) {
      const { error: pe } = await supabase
        .from('problems')
        .update({
          title: p.title.trim() || `Problem ${p.index}`,
          difficulty: p.difficulty,
          statement: p.statement.trim(),
          connection: p.connection?.trim() ?? '',
          answer: p.answer?.trim() ?? '',
          proof: p.proof?.trim() ?? '',
        })
        .eq('id', p.id);
      if (pe) {
        setError(pe.message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSaved();
  };

  const remove = async () => {
    if (!confirm('Delete this community set and all its problems?')) return;
    await supabase.from('week_sets').delete().eq('id', initial.id);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl animate-fade-in flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900/95 px-5 py-4 backdrop-blur">
          <h2 className="font-serif text-lg text-ink-50">Edit your community set</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Umbrella</span>
              <input value={umbrella} onChange={(e) => setUmbrella(e.target.value)} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Publish at</span>
              <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Reveal at</span>
              <input type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-ink-300">Problems (5)</h3>
            {problems.map((p, i) => (
              <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-850/40 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-accent-400/40 bg-accent-400/10 font-mono text-sm font-semibold text-accent-300">
                    {p.index}
                  </span>
                  <select
                    value={p.difficulty}
                    onChange={(e) => updateProblem(i, { difficulty: e.target.value as Difficulty })}
                    className="focus-ring rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    value={p.title}
                    onChange={(e) => updateProblem(i, { title: e.target.value })}
                    placeholder="Problem title"
                    className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-ink-100"
                  />
                </div>
                <textarea
                  value={p.statement}
                  onChange={(e) => updateProblem(i, { statement: e.target.value })}
                  rows={3}
                  placeholder="Statement (Markdown + LaTeX)"
                  className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                />
                <textarea
                  value={p.connection ?? ''}
                  onChange={(e) => updateProblem(i, { connection: e.target.value })}
                  rows={2}
                  placeholder="Connection to previous problem (optional for problem 1)"
                  className="focus-ring mt-2 w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <textarea
                    value={p.answer ?? ''}
                    onChange={(e) => updateProblem(i, { answer: e.target.value })}
                    rows={2}
                    placeholder="Answer (locked until reveal)"
                    className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                  />
                  <textarea
                    value={p.proof ?? ''}
                    onChange={(e) => updateProblem(i, { proof: e.target.value })}
                    rows={2}
                    placeholder="Proof (locked until reveal)"
                    className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-4">
            <button onClick={() => save(false)} disabled={busy} className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 hover:border-ink-600 hover:text-ink-100 disabled:opacity-50">
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button onClick={() => save(true)} disabled={busy} className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
            </button>
            <button onClick={remove} className="focus-ring ml-auto flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" /> Delete set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
