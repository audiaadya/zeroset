import { useEffect, useState } from 'react';
import { Bug, Loader2, Lock, Plus, Send, X, AlertCircle, CheckCircle2, ArrowLeft, Crown } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import MathText from '../components/MathText';

interface Props {
  navigate: (to: string) => void;
}

interface Bounty {
  id: string;
  problem_id: string | null;
  title: string;
  fake_proof: string;
  flaw_hint: string | null;
  author_id: string;
  author_name: string;
  status: string;
  solved_by_name: string | null;
  solution_comment: string | null;
  solved_at: string | null;
  created_at: string;
}

export default function BountyBoardPage({ navigate }: Props) {
  const { user, configured } = useAuth();
  const displayName = useDisplayName();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Bounty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flawClaim, setFlawClaim] = useState('');

  const [title, setTitle] = useState('');
  const [fakeProof, setFakeProof] = useState('');
  const [flawHint, setFlawHint] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bounty_boards')
      .select('*')
      .order('created_at', { ascending: false });
    setBounties((data as Bounty[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    void load();
  }, [configured]);

  const create = async () => {
    if (!user || !title.trim() || !fakeProof.trim()) return;
    setBusy(true);
    setError(null);
    const { error: insError } = await supabase.from('bounty_boards').insert({
      title: title.trim(),
      fake_proof: fakeProof.trim(),
      flaw_hint: flawHint.trim() || null,
      author_id: user.id,
      author_name: displayName,
      status: 'open',
    });
    if (insError) setError(insError.message);
    else {
      setTitle('');
      setFakeProof('');
      setFlawHint('');
      setShowCreate(false);
      void load();
    }
    setBusy(false);
  };

  const solve = async (b: Bounty) => {
    if (!user || !flawClaim.trim()) return;
    setBusy(true);
    const { error: updError } = await supabase
      .from('bounty_boards')
      .update({
        status: 'solved',
        solved_by_name: displayName,
        solution_comment: flawClaim.trim(),
        solved_at: new Date().toISOString(),
      })
      .eq('id', b.id);
    if (updError) setError(updError.message);
    else {
      setFlawClaim('');
      setSelected(null);
      void load();
    }
    setBusy(false);
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
          <ArrowLeft className="h-4 w-4" /> Back to bounty board
        </button>

        <header className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl text-ink-50 sm:text-4xl">{selected.title}</h1>
            {selected.status === 'solved' ? (
              <span className="flex items-center gap-1 rounded border border-accent-400/40 bg-accent-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300">
                <CheckCircle2 className="h-2.5 w-2.5" /> Solved
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-300">
                <Bug className="h-2.5 w-2.5" /> Open
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
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Fake proof</div>
            <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
              <MathText>{selected.fake_proof}</MathText>
            </div>
          </div>
          {selected.flaw_hint && (
            <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Flaw hint</div>
              <div className="text-sm text-ink-300">{selected.flaw_hint}</div>
            </div>
          )}
          {selected.status === 'solved' ? (
            <div className="rounded-xl border border-accent-400/30 bg-accent-400/10 p-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-300">Solution</div>
              <div className="text-sm text-ink-200">
                <span className="font-mono text-accent-300">{selected.solved_by_name}</span> found the flaw:
              </div>
              <div className="mt-2 rounded-md border border-ink-700 bg-ink-900 p-3">
                <MathText>{selected.solution_comment ?? ''}</MathText>
              </div>
            </div>
          ) : user ? (
            <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">Find the flaw</div>
              <textarea
                value={flawClaim}
                onChange={(e) => setFlawClaim(e.target.value)}
                rows={4}
                placeholder="Describe the logical flaw in the fake proof…"
                className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
              />
              {error && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
              <button
                onClick={() => solve(selected)}
                disabled={busy || !flawClaim.trim()}
                className="focus-ring mt-3 flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit flaw claim
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
              <Lock className="mx-auto h-8 w-8 text-accent-400" />
              <p className="mt-2 text-sm text-ink-400">Sign in to submit a flaw claim.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-300">
            <Bug className="h-3 w-3" />
            Fake Proof Bounty
          </span>
          <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Spot the flaw</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Each bounty is a fake proof — a real-looking argument with a hidden logical flaw. Find
            the error, explain it, and claim the bounty. First correct claim wins.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> Post a bounty
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bounties…
        </div>
      ) : bounties.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <Bug className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-ink-400">
            No bounties yet. {user ? 'Post the first fake proof.' : 'Sign in to post one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bounties.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="group rounded-xl border border-ink-700 bg-ink-850/50 p-5 text-left transition hover:border-accent-400/30 hover:bg-ink-850"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-lg text-ink-50 group-hover:text-accent-200">{b.title}</h3>
                {b.status === 'solved' ? (
                  <span className="flex items-center gap-1 rounded border border-accent-400/40 bg-accent-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-300">
                    <Bug className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                <span className="font-mono text-accent-300">{b.author_name}</span>
                <span>·</span>
                <span>{new Date(b.created_at).toLocaleDateString()}</span>
              </div>
              {b.solved_by_name && (
                <div className="mt-2 text-xs text-accent-300">
                  Solved by {b.solved_by_name}
                </div>
              )}
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
              <h2 className="font-serif text-lg text-ink-50">Post a fake proof bounty</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title (required)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The 1=2 Paradox"
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Fake proof (required)</label>
                <textarea
                  value={fakeProof}
                  onChange={(e) => setFakeProof(e.target.value)}
                  rows={8}
                  placeholder="Write the fake proof here. Use $...$ for inline math or $$...$$ for blocks."
                  className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Flaw hint (optional)</label>
                <input
                  value={flawHint}
                  onChange={(e) => setFlawHint(e.target.value)}
                  placeholder="A subtle hint about where the flaw is"
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
              <button
                onClick={create}
                disabled={busy || !title.trim() || !fakeProof.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post bounty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
