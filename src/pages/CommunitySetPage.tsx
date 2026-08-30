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
      if (ws.scope === 'community' && ws.status === 'published' && user && ws.owner_id !== user.id) {
        void supabase.rpc('bump_trending_score', { p_set_id: setId }).then(({ error }) => {
          if (error) {
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
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-600" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-handwritten text-2xl font-bold text-ink-950">Set not found</h2>
        <p className="mt-2 font-handwritten text-sm text-ink-700">It may not be published yet, or the link is wrong.</p>
        <button onClick={() => navigate('/community')} className="btn-sketch-notebook mt-4 px-4 py-2 font-handwritten text-sm font-bold">
          Back to community sets
        </button>
      </div>
    );
  }

  const isOwner = raw?.ws.owner_id === user?.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pt-24 sm:px-6">
      <button
        onClick={() => navigate('/community')}
        className="btn-sketch-notebook mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-xs font-bold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All community sets
      </button>

      <header className="mb-8">
        {set.umbrella && (
          <span className="inline-flex items-center gap-2 highlighter px-3 py-1 font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
            {set.umbrella}
          </span>
        )}
        <h1 className="mt-4 font-handwritten text-3xl font-bold text-ink-950 sm:text-4xl">{set.title}</h1>
        {set.description && <p className="mt-2 max-w-2xl font-handwritten text-sm text-ink-800">{set.description}</p>}
        <div className="mt-3 flex items-center gap-2 font-handwritten text-xs text-ink-600">
          <span className="font-bold text-accent-700">{raw?.ws.owner_name ?? 'community'}</span>
          {raw?.ws.status === 'draft' && <span className="text-amber-700">· draft</span>}
        </div>
      </header>

      {isOwner && raw && (
        <div className="mb-6">
          <button
            onClick={() => setEditing(true)}
            className="btn-sketch-notebook flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-xs font-bold"
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
            className={`btn-sketch-notebook flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-xs font-bold transition disabled:opacity-50 ${
              staffPick ? 'border-accent-500 bg-accent-50 text-accent-700' : ''
            }`}
          >
            {togglingPick ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star className={`h-3.5 w-3.5 ${staffPick ? 'fill-accent-500 text-accent-500' : ''}`} />
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
        {set.problems.map((p, i) => (
          <ProblemCard key={p.id} problem={p} week={set} climbIndex={i} totalClimb={set.problems.length} />
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
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl animate-fade-in flex-col overflow-hidden border-2 border-ink-700 bg-cream-100 shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
        <div className="flex shrink-0 items-center justify-between border-b border-ink-300 px-5 py-4">
          <h2 className="font-handwritten text-lg font-bold text-ink-950">Edit your community set</h2>
          <button onClick={onClose} className="btn-sketch-notebook p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }} />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Umbrella</span>
              <input value={umbrella} onChange={(e) => setUmbrella(e.target.value)} className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }} />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Publish at</span>
              <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }} />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Reveal at</span>
              <input type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }} />
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Problems (5)</h3>
            {problems.map((p, i) => (
              <div key={p.id} className="sketch-border-sm bg-cream-200 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center border-2 border-accent-500 bg-accent-50 font-handwritten text-sm font-bold text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
                    {p.index}
                  </span>
                  <select
                    value={p.difficulty}
                    onChange={(e) => updateProblem(i, { difficulty: e.target.value as Difficulty })}
                    className="border-2 border-ink-400 bg-white px-2 py-1 font-handwritten text-xs text-ink-900 focus:outline-none focus:border-accent-500"
                    style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    value={p.title}
                    onChange={(e) => updateProblem(i, { title: e.target.value })}
                    placeholder="Problem title"
                    className="flex-1 border-2 border-ink-400 bg-white px-3 py-1.5 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                    style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                  />
                </div>
                <textarea
                  value={p.statement}
                  onChange={(e) => updateProblem(i, { statement: e.target.value })}
                  rows={3}
                  placeholder="Statement (Markdown + LaTeX)"
                  className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                  style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                />
                <textarea
                  value={p.connection ?? ''}
                  onChange={(e) => updateProblem(i, { connection: e.target.value })}
                  rows={2}
                  placeholder="Connection to previous problem (optional for problem 1)"
                  className="mt-2 w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                  style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <textarea
                    value={p.answer ?? ''}
                    onChange={(e) => updateProblem(i, { answer: e.target.value })}
                    rows={2}
                    placeholder="Answer (locked until reveal)"
                    className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                    style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                  />
                  <textarea
                    value={p.proof ?? ''}
                    onChange={(e) => updateProblem(i, { proof: e.target.value })}
                    rows={2}
                    placeholder="Proof (locked until reveal)"
                    className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                    style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 sketch-border-sm bg-red-50 px-3 py-2 font-handwritten text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-300 pt-4">
            <button onClick={() => save(false)} disabled={busy} className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold disabled:opacity-50">
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button onClick={() => save(true)} disabled={busy} className="btn-sketch-notebook flex items-center gap-1.5 border-accent-500 px-4 py-2 font-handwritten text-sm font-bold text-accent-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
            </button>
            <button onClick={remove} className="btn-sketch-notebook ml-auto flex items-center gap-1.5 border-red-400 px-3 py-2 font-handwritten text-xs font-bold text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
