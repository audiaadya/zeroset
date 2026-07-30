import { useEffect, useState } from 'react';
import { Puzzle, Loader2, Lock, Plus, Send, X, AlertCircle, ThumbsUp, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import MathText from '../components/MathText';

interface Props {
  navigate: (to: string) => void;
}

interface ReverseEngPrompt {
  id: string;
  author_id: string;
  author_name: string;
  target_answer: string;
  constraint_text: string | null;
  story_problem: string;
  title: string | null;
  upvotes: number;
  status: string;
  created_at: string;
}

export default function ReverseEngPage({ navigate }: Props) {
  const { user, configured, isHost } = useAuth();
  const displayName = useDisplayName();
  const [prompts, setPrompts] = useState<ReverseEngPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<ReverseEngPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState('');
  const [targetAnswer, setTargetAnswer] = useState('');
  const [constraintText, setConstraintText] = useState('');
  const [storyProblem, setStoryProblem] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reverse_eng_prompts')
      .select('*')
      .order('upvotes', { ascending: false });
    setPrompts((data as ReverseEngPrompt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    void load();
    const v = localStorage.getItem('zeroset:reverse-eng-votes');
    if (v) setVoted(new Set(JSON.parse(v)));
  }, [configured]);

  const create = async () => {
    if (!user || !targetAnswer.trim()) return;
    if (!isHost && !storyProblem.trim()) {
      setError('Story problem is required.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: insError } = await supabase.from('reverse_eng_prompts').insert({
      author_id: user.id,
      author_name: displayName,
      target_answer: targetAnswer.trim(),
      constraint_text: constraintText.trim() || null,
      story_problem: storyProblem.trim() || (isHost ? '(Host prompt — no story problem required)' : ''),
      title: title.trim() || null,
    });
    if (insError) setError(insError.message);
    else {
      setTitle('');
      setTargetAnswer('');
      setConstraintText('');
      setStoryProblem('');
      setShowCreate(false);
      void load();
    }
    setBusy(false);
  };

  const upvote = async (p: ReverseEngPrompt) => {
    if (!user) return;
    if (voted.has(p.id)) return;
    const { error: updError } = await supabase
      .from('reverse_eng_prompts')
      .update({ upvotes: p.upvotes + 1 })
      .eq('id', p.id);
    if (!updError) {
      const newVoted = new Set(voted);
      newVoted.add(p.id);
      setVoted(newVoted);
      localStorage.setItem('zeroset:reverse-eng-votes', JSON.stringify(Array.from(newVoted)));
      void load();
    }
  };

  const promote = async (p: ReverseEngPrompt) => {
    if (!isHost) return;
    const { error: updError } = await supabase
      .from('reverse_eng_prompts')
      .update({ status: 'spotlight' })
      .eq('id', p.id);
    if (!updError) void load();
  };

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-yellow-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <button
          onClick={() => setSelected(null)}
          className="focus-ring mb-6 inline-flex items-center gap-2 rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to reverse engineering
        </button>
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl text-ink-50 sm:text-4xl">{selected.title || `Target: ${selected.target_answer}`}</h1>
            {selected.status === 'spotlight' && (
              <span className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                <Crown className="h-2.5 w-2.5" /> Spotlight
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
            <span className="font-mono text-accent-300">{selected.author_name}</span>
            <span>·</span>
            <span>{new Date(selected.created_at).toLocaleDateString()}</span>
          </div>
        </header>

        <div className="space-y-4">
          <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Target answer</div>
            <div className="font-mono text-lg text-accent-200">{selected.target_answer}</div>
          </div>
          {selected.constraint_text && (
            <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Constraint</div>
              <div className="text-sm text-ink-300">{selected.constraint_text}</div>
            </div>
          )}
          <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Story problem</div>
            <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
              <MathText>{selected.story_problem}</MathText>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => upvote(selected)}
              disabled={!user || voted.has(selected.id)}
              className={`flex items-center gap-1 rounded border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                voted.has(selected.id)
                  ? 'border-accent-400/40 bg-accent-400/10 text-accent-300'
                  : 'border-ink-700 text-ink-300 hover:border-accent-400/40 hover:text-accent-200'
              }`}
            >
              <ThumbsUp className="h-4 w-4" /> {selected.upvotes}
            </button>
            {isHost && selected.status !== 'spotlight' && (
              <button
                onClick={() => promote(selected)}
                className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
              >
                <Sparkles className="h-3 w-3" /> Promote
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
          <Puzzle className="h-3 w-3" />
          Reverse Engineering
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Build the Question</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          We give you a strict final answer. You write a creative, original story problem that lands
          on that exact solution. Other users test and vote on the setups. The highest-rated
          user-generated problem gets promoted to an official Community Spotlight slot the following
          week.
        </p>
      </header>

      {user && (
        <div className="mb-6">
          <button
            onClick={() => setShowCreate(true)}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> {isHost ? 'Post a reverse proof prompt' : 'Submit a prompt'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading prompts…
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <Puzzle className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-ink-400">
            No prompts yet. {user ? 'Be the first to build a question.' : 'Sign in to submit one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="group rounded-xl border border-ink-700 bg-ink-850/50 p-5 text-left transition hover:border-accent-400/30 hover:bg-ink-850"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-lg text-ink-50 group-hover:text-accent-200">
                  {p.title || `Target: ${p.target_answer}`}
                </h3>
                {p.status === 'spotlight' && (
                  <span className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                    <Crown className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                <span className="font-mono text-accent-300">{p.author_name}</span>
                <span>·</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 rounded-md border border-ink-700 bg-ink-900/50 p-2 text-sm text-ink-300">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Target: </span>
                <span className="font-mono text-accent-200">{p.target_answer}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
                <ThumbsUp className="h-3 w-3" /> {p.upvotes} upvotes
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && user && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowCreate(false)} aria-hidden />
          <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl animate-fade-in flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
            <div className="flex shrink-0 items-center justify-between border-b border-ink-700 px-5 py-4">
              <h2 className="font-serif text-lg text-ink-50">{isHost ? 'Post a reverse proof prompt' : 'Build a question'}</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title (optional)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A short name for your problem"
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Target answer (required)</label>
                <input
                  value={targetAnswer}
                  onChange={(e) => setTargetAnswer(e.target.value)}
                  placeholder="e.g. 1/2026"
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Constraint (optional)</label>
                <input
                  value={constraintText}
                  onChange={(e) => setConstraintText(e.target.value)}
                  placeholder="e.g. Must use an invariant parity shift of a 7x7 grid"
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">
                  Story problem {isHost ? '(optional for host)' : '(required)'}
                </label>
                <textarea
                  value={storyProblem}
                  onChange={(e) => setStoryProblem(e.target.value)}
                  rows={6}
                  placeholder={isHost ? 'Write a story problem, or leave blank to post just the target answer.' : 'Write the full story problem whose answer is the target above.'}
                  className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
              <button
                onClick={create}
                disabled={busy || !targetAnswer.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
