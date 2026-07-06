import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
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
  Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import type { DbProblem, DbWeekSet, Difficulty } from '../lib/types';
import ProblemTags from '../components/ProblemTags';

interface Props {
  navigate: (to: string) => void;
}

const DIFFICULTIES: Difficulty[] = ['Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad'];

// Default publish = next Sunday 23:59 local, reveal = the Sunday after, 23:59.
function nextSunday(endOfDay: boolean): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const daysUntilSunday = (7 - day) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, 0, 0);
  return d;
}

function toLocalInput(d: Date): string {
  // yyyy-MM-ddTHH:mm
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

export default function HostDashboardPage({ navigate }: Props) {
  const { user, isHost, configured, loading } = useAuth();
  const displayName = useDisplayName();
  const [sets, setSets] = useState<{ ws: DbWeekSet; problems: DbProblem[] }[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ ws: DbWeekSet; problems: DbProblem[] } | null>(null);

  const load = async () => {
    setLoadingSets(true);
    const { data, error } = await supabase
      .from('week_sets')
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
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
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-ink-400 sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <AlertCircle className="mx-auto h-8 w-8 text-yellow-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2>
        <p className="mt-2 text-sm text-ink-400">
          The host dashboard needs a connected database to draft and publish sets.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-accent-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Sign in to continue</h2>
        <p className="mt-2 text-sm text-ink-400">You need to be signed in to reach this page.</p>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-red-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Hosts only</h2>
        <p className="mt-2 text-sm text-ink-400">
          The host dashboard is restricted to the site owner. Anyone can create a Community Set
          though — head to the Community Sets page to start your own weekly bundle.
        </p>
        <button
          onClick={() => navigate('/community')}
          className="mt-5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
        >
          Create a community set
        </button>
      </div>
    );
  }

  const createNew = async () => {
    const publish = nextSunday(true);
    const reveal = new Date(publish.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('week_sets')
      .insert({
        owner_id: user.id,
        owner_name: displayName,
        scope: 'official',
        status: 'draft',
        title: 'Untitled week',
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
    // Seed 5 empty problems
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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            <Layers className="h-3 w-3" />
            Host dashboard
          </span>
          <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Draft & publish weekly sets</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Draft problems, set the Sunday-night publish time, and the answers auto-lock until the
            next Sunday night. Only your account can publish to the official Current Week.
          </p>
        </div>
        <button
          onClick={createNew}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
        >
          <Plus className="h-4 w-4" /> New draft
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingSets ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your sets…
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <p className="text-sm text-ink-400">No drafts yet. Click “New draft” to start this week's bundle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map(({ ws, problems }) => (
            <SetRow key={ws.id} ws={ws} problemCount={problems.length} onEdit={() => setEditing({ ws, problems })} onChanged={load} />
          ))}
        </div>
      )}

      {editing && (
        <SetEditor
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

function SetRow({
  ws,
  problemCount,
  onEdit,
  onChanged,
}: {
  ws: DbWeekSet;
  problemCount: number;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const isPublished = ws.status === 'published';
  const publishDate = ws.publish_at ? new Date(ws.publish_at) : null;
  const revealDate = ws.reveal_at ? new Date(ws.reveal_at) : null;
  const now = Date.now();
  const live = publishDate ? publishDate.getTime() <= now : false;
  const unlocked = revealDate ? revealDate.getTime() <= now : false;

  const remove = async () => {
    if (!confirm('Delete this set and all its problems? This cannot be undone.')) return;
    await supabase.from('week_sets').delete().eq('id', ws.id);
    onChanged();
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-850/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold ${
            isPublished
              ? 'border-accent-400/40 bg-accent-400/10 text-accent-300'
              : 'border-ink-700 bg-ink-900 text-ink-400'
          }`}
        >
          {ws.scope === 'official' ? 'O' : 'C'}
        </span>
        <div>
          <h3 className="font-serif text-base text-ink-50">{ws.title || 'Untitled'}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <span className={`font-mono uppercase tracking-wider ${isPublished ? 'text-accent-300' : 'text-ink-500'}`}>
              {ws.status}
            </span>
            <span>·</span>
            <span>{problemCount}/5 problems</span>
            {publishDate && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {publishDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
            {isPublished && live && !unlocked && (
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="h-3 w-3" /> live · answers locked
              </span>
            )}
            {isPublished && unlocked && (
              <span className="flex items-center gap-1 text-accent-300">
                <Check className="h-3 w-3" /> answers unlocked
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={remove}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

function SetEditor({
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
  const [title, setTitle] = useState(initial.title);
  const [umbrella, setUmbrella] = useState(initial.umbrella ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [weekNumber, setWeekNumber] = useState<number | null>(initial.week_number);
  const [publishAt, setPublishAt] = useState(
    initial.publish_at ? toLocalInput(new Date(initial.publish_at)) : ''
  );
  const [revealAt, setRevealAt] = useState(
    initial.reveal_at ? toLocalInput(new Date(initial.reveal_at)) : ''
  );
  const [problems, setProblems] = useState<DbProblem[]>(initialProblems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<number | null>(null);

  const updateProblem = (i: number, patch: Partial<DbProblem>) => {
    setProblems((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const save = async (publish: boolean) => {
    if (!user) return;
    if (title.trim().length < 3) {
      setError('Add a title.');
      return;
    }
    if (problems.some((p) => p.statement.trim().length < 5)) {
      setError('Every problem needs a statement.');
      return;
    }
    if (publish && (!publishAt || !revealAt)) {
      setError('Set a publish and reveal time before publishing.');
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
        week_number: weekNumber,
        publish_at: publishAt ? fromLocalInput(publishAt) : null,
        reveal_at: revealAt ? fromLocalInput(revealAt) : null,
        status: publish ? 'published' : 'draft',
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 w-full max-w-3xl animate-fade-in rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-700 bg-ink-900/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="font-serif text-lg text-ink-50">Edit weekly set</h2>
            <p className="mt-0.5 text-xs text-ink-400">
              Drafts are private. Publishing makes the set live at the publish time; answers stay
              locked until the reveal time.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Set metadata */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                placeholder="e.g. Structural Induction & Recurrence Relations"
              />
            </Labeled>
            <Labeled label="Umbrella topic">
              <input
                value={umbrella}
                onChange={(e) => setUmbrella(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                placeholder="e.g. Induction"
              />
            </Labeled>
            <Labeled label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                placeholder="One-paragraph intro to the week's theme."
              />
            </Labeled>
            <Labeled label="Week number (optional)">
              <input
                type="number"
                value={weekNumber ?? ''}
                onChange={(e) => setWeekNumber(e.target.value ? Number(e.target.value) : null)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                placeholder="e.g. 4"
              />
            </Labeled>
            <Labeled label="Publish at (Sunday night)">
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </Labeled>
            <Labeled label="Reveal at (next Sunday night)">
              <input
                type="datetime-local"
                value={revealAt}
                onChange={(e) => setRevealAt(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </Labeled>
          </div>

          {/* Problems */}
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
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    value={p.title}
                    onChange={(e) => updateProblem(i, { title: e.target.value })}
                    placeholder="Problem title"
                    className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-ink-100"
                  />
                  <button
                    onClick={() => setShowPreview(showPreview === i ? null : i)}
                    className="focus-ring rounded-md border border-ink-700 px-2 py-1 text-[10px] uppercase tracking-wider text-ink-400 hover:text-accent-300"
                  >
                    {showPreview === i ? 'Write' : 'Preview'}
                  </button>
                </div>
                {showPreview === i ? (
                  <div className="rounded-md border border-ink-700 bg-ink-900 p-3 text-sm text-ink-200">
                    <div className="font-serif text-base text-ink-50">{p.title || 'Untitled'}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                      {p.difficulty}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-ink-300">{p.statement}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={p.statement}
                      onChange={(e) => updateProblem(i, { statement: e.target.value })}
                      rows={3}
                      placeholder="Statement (Markdown + LaTeX: $...$ inline, $$...$$ block)"
                      className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                    />
                    <textarea
                      value={p.connection ?? ''}
                      onChange={(e) => updateProblem(i, { connection: e.target.value })}
                      rows={2}
                      placeholder="How this connects to the previous problem (optional for problem 1)"
                      className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
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
                    <div className="mt-2">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-300">
                        <Tag className="h-3 w-3" />
                        Tags
                      </label>
                      <ProblemTags problemId={p.id} editable />
                    </div>
                  </div>
                )}
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
            <button
              onClick={() => save(false)}
              disabled={busy}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 hover:border-ink-600 hover:text-ink-100 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={busy}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish
            </button>
            <span className="text-xs text-ink-500">
              Publishing makes the set live at the publish time. Answers stay locked until reveal.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">{label}</span>
      {children}
    </label>
  );
}
