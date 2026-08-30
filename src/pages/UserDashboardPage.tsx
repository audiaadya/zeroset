import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit3,
  Layers,
  Loader2,
  Lock,
  Plus,
  Save,
  Send,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import type { DbProblem, DbWeekSet, Difficulty } from '../lib/types';
import MathText from '../components/MathText';
import CountdownTimer from '../components/CountdownTimer';

interface Props {
  navigate: (to: string) => void;
}

const DIFFICULTIES: Difficulty[] = ['Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad'];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

const PROOF_DELIMITER = '\n\n---\n\n';

function extractProofSection(proof: string, section: 'setup' | 'core' | 'conclusion'): string {
  if (!proof) return '';
  const parts = proof.split(PROOF_DELIMITER);
  if (parts.length >= 3) {
    if (section === 'setup') return parts[0];
    if (section === 'core') return parts[1];
    return parts[2];
  }
  const markers: Record<string, RegExp> = {
    setup: /(Base case|Setup|Initialization|Start|Begin|First)[^]*?(\n\n|$)/i,
    core: /(Inductive step|Main|Core|Key|Argument|Assume|Then|Hence)[^]*?(\n\n|$)/i,
    conclusion: /(Therefore|Thus|Q\.?E\.?D|Conclusion|Done|Complete)[^]*$/i,
  };
  const match = proof.match(markers[section]);
  return match ? match[0].trim() : '';
}

function combineProof(setup: string, core: string, conclusion: string): string {
  return [setup.trim(), core.trim(), conclusion.trim()].filter(Boolean).join(PROOF_DELIMITER);
}

export default function UserDashboardPage({ navigate }: Props) {
  const { user, configured, loading } = useAuth();
  const displayName = useDisplayName();
  const [sets, setSets] = useState<{ ws: DbWeekSet; problems: DbProblem[] }[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ ws: DbWeekSet; problems: DbProblem[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoadingSets(true);
    const { data, error } = await supabase
      .from('week_sets')
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
      .eq('owner_id', user.id)
      .eq('scope', 'community')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else {
      const rows = data as DbWeekSet[];
      const out: { ws: DbWeekSet; problems: DbProblem[] }[] = [];
      for (const ws of rows) {
        const { data: probs } = await supabase
          .from('problems')
          .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
          .eq('set_id', ws.id)
          .order('index', { ascending: true });
        out.push({ ws, problems: (probs as DbProblem[]) ?? [] });
      }
      setSets(out);
    }
    setLoadingSets(false);
  };

  useEffect(() => {
    if (!configured || !user) {
      setLoadingSets(false);
      return;
    }
    void load();
  }, [configured, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-600" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
        <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">Database not configured</h2>
        <p className="mt-2 font-handwritten text-sm text-ink-700">
          You need a connected database to create weekly sets.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-accent-600" />
        <h2 className="mt-4 font-handwritten text-2xl font-bold text-ink-950">Sign in to continue</h2>
        <p className="mt-2 font-handwritten text-sm text-ink-700">You need to be signed in to create your own weekly sets.</p>
      </div>
    );
  }

  const createNew = async () => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 0, 0);
    const publish = d;
    const reveal = new Date(publish.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('week_sets')
      .insert({
        owner_id: user.id,
        owner_name: displayName,
        scope: 'community',
        status: 'draft',
        title: 'Untitled weekly set',
        umbrella: '',
        description: '',
        publish_at: publish.toISOString(),
        reveal_at: reveal.toISOString(),
      })
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    const ws = data as DbWeekSet;
    const probs = Array.from({ length: 5 }, (_, i) => ({
      set_id: ws.id,
      index: i + 1,
      title: '',
      difficulty: DIFFICULTIES[i] as Difficulty,
      statement: '',
      connection: '',
      answer: '',
      proof: '',
    }));
    const { data: inserted, error: pe } = await supabase
      .from('problems')
      .insert(probs)
      .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
      .order('index', { ascending: true });
    if (pe) setError(pe.message);
    else {
      setEditing({ ws, problems: (inserted as DbProblem[]) ?? [] });
      void load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 pt-24 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
            <Layers className="h-3.5 w-3.5" />
            My Weekly Sets
          </span>
          <h1 className="mt-4 font-handwritten text-3xl font-bold text-ink-950 sm:text-4xl">Create your own weekly sets</h1>
          <p className="mt-2 max-w-2xl font-handwritten text-sm text-ink-700">
            Run your own recurring weekly math problem bundle. Same structure as the official sets —
            five problems, a steep climb, a one-week answer lock — under your own brand.
          </p>
        </div>
        <button
          onClick={() => void createNew()}
          className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold"
        >
          <Plus className="h-4 w-4" /> New weekly set
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 sketch-border-sm bg-red-50 px-3 py-2 font-handwritten text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingSets ? (
        <div className="flex items-center gap-2 font-handwritten text-sm text-ink-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your sets…
        </div>
      ) : sets.length === 0 ? (
        <div className="sketch-border bg-cream-100 p-8 text-center">
          <p className="font-handwritten text-sm text-ink-700">No weekly sets yet. Click "New weekly set" to start your first bundle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map(({ ws, problems }) => (
            <UserSetRow
              key={ws.id}
              ws={ws}
              problemCount={problems.length}
              onEdit={() => setEditing({ ws, problems })}
              onChanged={() => void load()}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {editing && (
        <UserSetEditor
          initial={editing.ws}
          initialProblems={editing.problems}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function UserSetRow({
  ws,
  problemCount,
  onEdit,
  onChanged,
  navigate,
}: {
  ws: DbWeekSet;
  problemCount: number;
  onEdit: () => void;
  onChanged: () => void;
  navigate: (to: string) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const publish = async () => {
    setPublishing(true);
    await supabase.from('week_sets').update({ status: 'published' }).eq('id', ws.id);
    setPublishing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm('Delete this entire set and all its problems? This cannot be undone.')) return;
    setDeleting(true);
    const { data: probs } = await supabase.from('problems').select('id').eq('set_id', ws.id);
    if (probs) {
      await supabase.from('problems').delete().eq('set_id', ws.id);
    }
    await supabase.from('week_sets').delete().eq('id', ws.id);
    setDeleting(false);
    onChanged();
  };

  const isPublished = ws.status === 'published';

  return (
    <div className="flex flex-col gap-3 border-2 border-ink-400 bg-cream-100 p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderRadius: '12px 4px 10px 4px / 4px 10px 4px 12px' }}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-handwritten text-lg font-bold text-ink-950">{ws.title || 'Untitled'}</h3>
          <span
            className={`rounded-full px-2 py-0.5 font-handwritten text-[10px] font-bold uppercase tracking-wider ${
              isPublished
                ? 'border border-accent-500 bg-accent-50 text-accent-700'
                : 'border border-ink-400 bg-cream-200 text-ink-600'
            }`}
          >
            {ws.status}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 font-handwritten text-xs text-ink-600">
          <span>{problemCount} problems</span>
          {ws.publish_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(ws.publish_at).toLocaleDateString()}
            </span>
          )}
          {ws.reveal_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> reveal {new Date(ws.reveal_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {isPublished && ws.reveal_at && new Date(ws.reveal_at).getTime() > Date.now() && (
          <div className="mt-2">
            <CountdownTimer target={ws.reveal_at} compact label="Answers unlock in" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isPublished && (
          <button
            onClick={() => navigate(`/community/${ws.id}`)}
            className="flex items-center gap-1.5 border-2 border-ink-400 px-3 py-1.5 font-handwritten text-xs font-bold text-ink-800 transition hover:border-accent-500 hover:text-accent-700"
            style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
          >
            <Layers className="h-3.5 w-3.5" /> View
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 border-2 border-ink-400 px-3 py-1.5 font-handwritten text-xs font-bold text-ink-800 transition hover:border-accent-500 hover:text-accent-700"
          style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        {ws.status === 'draft' && (
          <button
            onClick={publish}
            disabled={publishing}
            className="flex items-center gap-1.5 border-2 border-accent-500 bg-accent-50 px-3 py-1.5 font-handwritten text-xs font-bold text-accent-700 transition hover:bg-accent-100 disabled:opacity-50"
            style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish
          </button>
        )}
        <button
          onClick={remove}
          disabled={deleting}
          className="border-2 border-red-500/40 p-1.5 text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
          title="Delete set"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function UserSetEditor({
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
  const setId = initial.id;
  const [title, setTitle] = useState(initial.title);
  const [weekNumber, setWeekNumber] = useState<string>(initial.week_number?.toString() ?? '');
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
    setBusy(true);
    setError(null);
    const { error: wsError } = await supabase.from('week_sets').update({
      title: title.trim(),
      week_number: weekNumber.trim() ? parseInt(weekNumber, 10) : null,
      umbrella: umbrella.trim(),
      description: description.trim(),
      publish_at: publishAt ? fromLocalInput(publishAt) : null,
      reveal_at: revealAt ? fromLocalInput(revealAt) : null,
      status: publish ? 'published' : 'draft',
    }).eq('id', setId);
    if (wsError) { setError(wsError.message); setBusy(false); return; }
    for (const p of problems) {
      const { error: pe } = await supabase.from('problems').update({
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        connection: p.connection,
        answer: p.answer,
        proof: p.proof,
      }).eq('id', p.id);
      if (pe) { setError(pe.message); setBusy(false); return; }
    }
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl animate-fade-in flex-col overflow-hidden border-2 border-ink-500 bg-cream-100 shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
        {/* Floating save bar */}
        <div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 md:left-auto md:right-6 md:top-24 md:w-72 md:translate-x-0">
          <div className="border-2 border-ink-500 bg-cream-100/95 p-3 shadow-panel backdrop-blur" style={{ borderRadius: '12px 4px 10px 4px / 4px 10px 4px 12px' }}>
            <div className="mb-2 font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">
              Save / Publish
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => save(false)}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 border-2 border-ink-400 px-4 py-2 font-handwritten text-sm font-bold text-ink-800 transition hover:border-ink-600 hover:text-ink-950 disabled:opacity-50"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              >
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button
                onClick={() => save(true)}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 border-2 border-accent-500 bg-accent-50 px-4 py-2 font-handwritten text-sm font-bold text-accent-700 transition hover:bg-accent-100 disabled:opacity-50"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b-2 border-ink-400 bg-cream-100/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="font-handwritten text-xl font-bold text-ink-950">Edit your weekly set</h2>
            <p className="mt-0.5 font-handwritten text-xs text-ink-700">
              Drafts are private. Publishing makes your set live on the Community Sets page; answers
              stay locked until your reveal time.
            </p>
          </div>
          <button onClick={onClose} className="btn-sketch-notebook p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 md:pr-80">
          {/* Metadata */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Week #</span>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                placeholder="e.g. 1"
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Umbrella topic</span>
              <input
                value={umbrella}
                onChange={(e) => setUmbrella(e.target.value)}
                placeholder="e.g. Number Theory"
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
              style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Publish at</span>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Reveal at</span>
              <input
                type="datetime-local"
                value={revealAt}
                onChange={(e) => setRevealAt(e.target.value)}
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
          </div>

          {/* Live countdown preview */}
          {revealAt && (
            <div className="border-2 border-accent-500/30 bg-accent-50 p-4" style={{ borderRadius: '12px 4px 10px 4px / 4px 10px 4px 12px' }}>
              <h3 className="mb-3 font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
                Countdown Preview
              </h3>
              <CountdownTimer target={revealAt} label="Answers unlock in" />
            </div>
          )}

          {/* Problems */}
          <div className="space-y-4">
            <h3 className="font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Problems (5)</h3>
            {problems.map((p, i) => (
              <div key={p.id} className="border-2 border-ink-400 bg-cream-200/50 p-4" style={{ borderRadius: '12px 4px 10px 4px / 4px 10px 4px 12px' }}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center border-2 border-accent-500 bg-accent-50 font-handwritten text-sm font-bold text-accent-700" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
                    {p.index}
                  </span>
                  <span className="font-handwritten text-[10px] font-bold uppercase tracking-wider text-ink-600">
                    Problem {p.index}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Title</span>
                      <input
                        value={p.title}
                        onChange={(e) => updateProblem(i, { title: e.target.value })}
                        className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Difficulty</span>
                      <select
                        value={p.difficulty}
                        onChange={(e) => updateProblem(i, { difficulty: e.target.value as Difficulty })}
                        className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Statement</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      <textarea
                        value={p.statement}
                        onChange={(e) => updateProblem(i, { statement: e.target.value })}
                        rows={6}
                        placeholder="The full problem statement. Use $...$ for inline math or $$...$$ for blocks."
                        className="w-full resize-y border-2 border-ink-400 bg-graph-paper px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      />
                      <div className="min-h-[8rem] border-2 border-ink-400 bg-white/60 p-3" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
                        <div className="mb-1.5 font-handwritten text-[9px] font-bold uppercase tracking-wider text-ink-600">Live Preview</div>
                        {p.statement?.trim() ? (
                          <MathText>{p.statement}</MathText>
                        ) : (
                          <span className="font-handwritten text-xs text-ink-500">Preview will appear here…</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Connection to previous problem</span>
                    <textarea
                      value={p.connection ?? ''}
                      onChange={(e) => updateProblem(i, { connection: e.target.value })}
                      rows={2}
                      placeholder="How does this problem build on the previous one?"
                      className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                      style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea
                      value={p.answer ?? ''}
                      onChange={(e) => updateProblem(i, { answer: e.target.value })}
                      rows={2}
                      placeholder="Answer (locked until reveal)"
                      className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500"
                      style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                    />
                  </div>
                  <div className="mt-3 border-2 border-accent-500/30 bg-accent-50 p-3" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
                    <div className="mb-2 font-handwritten text-[10px] font-bold uppercase tracking-wider text-accent-700">
                      Proof Walk Sections
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'setup')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(e.target.value, extractProofSection(p.proof ?? '', 'core'), extractProofSection(p.proof ?? '', 'conclusion')) })}
                        rows={4}
                        placeholder="Setup & Base Case — initialize the proof structure"
                        className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500 scrollbar-thin"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      />
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'core')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(extractProofSection(p.proof ?? '', 'setup'), e.target.value, extractProofSection(p.proof ?? '', 'conclusion')) })}
                        rows={6}
                        placeholder="Core Logic — the main argument / inductive step"
                        className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500 scrollbar-thin"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      />
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'conclusion')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(extractProofSection(p.proof ?? '', 'setup'), extractProofSection(p.proof ?? '', 'core'), e.target.value) })}
                        rows={4}
                        placeholder="Conclusion — therefore / Q.E.D."
                        className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-mono text-xs text-ink-950 focus:outline-none focus:border-accent-500 scrollbar-thin"
                        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
                      />
                    </div>
                    <p className="mt-2 font-handwritten text-[10px] text-ink-600">
                      These sections power the Interactive Proof-Walk. Each becomes a separate step.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
