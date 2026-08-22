import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Lock, Eye, EyeOff, AlertCircle, Trash2, ChevronDown, Check, Crown, SplitSquareHorizontal, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import { syncMyProfile } from '../lib/profile';
import MathText from './MathText';
import LaTeXMacros from './LaTeXMacros';
import MediaAttachments from './MediaAttachments';
import SolutionComments from './SolutionComments';
import MathConfetti from './MathConfetti';
import type { Solution } from '../lib/types';

interface Props {
  problemId: string;
  weekId: string;
  onCorrect?: () => void;
}

interface SolutionRow extends Solution {
  is_correct?: boolean;
  vote_count?: number;
  my_vote?: boolean;
}

const SAMPLE = `Write your solution in plain text. Wrap math in $...$ for inline or $$...$$ for a block.

For example, $sum_{k=1}^n k = n(n+1)/2$, or

$$integral from 0 to 1 of x^2 dx = 1/3.$$`;

const DRAFT_KEY = (problemId: string) => `zeroset:draft:${problemId}`;

export default function SolutionEditor({ problemId, weekId, onCorrect }: Props) {
  const { user, configured, isHost } = useAuth();
  const displayName = useDisplayName();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mySolution, setMySolution] = useState<SolutionRow | null>(null);
  const [loadingMine, setLoadingMine] = useState(true);
  const [showCommunity, setShowCommunity] = useState(false);
  const [community, setCommunity] = useState<SolutionRow[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'write' | 'preview'>('split');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(DRAFT_KEY(problemId));
    if (saved && saved.trim().length > 0) {
      setDraft(saved);
    }
  }, [problemId, user]);

  // Visitors (not signed in) also get a local draft — keyed separately so it
  // doesn't collide with a signed-in user's draft.
  useEffect(() => {
    if (user) return;
    const saved = localStorage.getItem(DRAFT_KEY(problemId));
    if (saved && saved.trim().length > 0) {
      setDraft(saved);
    }
  }, [problemId, user]);

  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY(problemId), draft);
      setSavedAt(Date.now());
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, problemId]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY(problemId));
    setSavedAt(null);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingMine(true);
    (async () => {
      if (!configured || !user) {
        if (!cancelled) setLoadingMine(false);
        return;
      }
      const { data, error } = await supabase
        .from('solutions')
        .select('id, problem_id, author_id, author_name, body, created_at, is_correct')
        .eq('problem_id', problemId)
        .eq('author_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        if (error) setError(error.message);
        else setMySolution(data as SolutionRow | null);
        setLoadingMine(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [problemId, user, configured]);

  // Hosts: auto-load community solutions on mount (bypass submission requirement)
  useEffect(() => {
    if (isHost && configured && !loadingMine) {
      setShowCommunity(true);
      void loadCommunity();
    }
  }, [isHost, configured, loadingMine]);

  const loadCommunity = async () => {
    setLoadingCommunity(true);
    const { data, error } = await supabase
      .from('solutions')
      .select('id, problem_id, author_id, author_name, body, created_at, is_correct')
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setLoadingCommunity(false);
      return;
    }
    const rows = (data as SolutionRow[]) ?? [];
    const { data: votes } = await supabase
      .from('solution_votes')
      .select('solution_id, voter_id')
      .in('solution_id', rows.map((r) => r.id));
    const voteMap = new Map<string, { count: number; mine: boolean }>();
    for (const v of (votes ?? []) as { solution_id: string; voter_id: string }[]) {
      const cur = voteMap.get(v.solution_id) ?? { count: 0, mine: false };
      cur.count += 1;
      if (v.voter_id === user?.id) cur.mine = true;
      voteMap.set(v.solution_id, cur);
    }
    setCommunity(
      rows.map((r) => ({
        ...r,
        vote_count: voteMap.get(r.id)?.count ?? 0,
        my_vote: voteMap.get(r.id)?.mine ?? false,
      }))
    );
    setLoadingCommunity(false);
  };

  const toggleVote = async (solutionId: string, currentlyVoted: boolean) => {
    if (!user) {
      setError('Sign in to vote.');
      return;
    }
    if (currentlyVoted) {
      await supabase.from('solution_votes').delete().eq('solution_id', solutionId).eq('voter_id', user.id);
    } else {
      await supabase.from('solution_votes').insert({ solution_id: solutionId, voter_id: user.id });
    }
    setCommunity((c) =>
      c.map((s) =>
        s.id === solutionId
          ? { ...s, vote_count: (s.vote_count ?? 0) + (currentlyVoted ? -1 : 1), my_vote: !currentlyVoted }
          : s
      )
    );
  };

  const submit = async () => {
    if (!user) {
      setError('Sign in to submit your solution and join the leaderboard.');
      return;
    }
    if (draft.trim().length < 5) {
      setError('Write a bit more before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    if (mySolution) {
      const { data, error } = await supabase
        .from('solutions')
        .update({ body: draft })
        .eq('id', mySolution.id)
        .select('id, problem_id, author_id, author_name, body, created_at, is_correct')
        .maybeSingle();
      if (error) setError(error.message);
      else if (data) {
        setMySolution(data as SolutionRow);
        setDraft('');
        clearDraft();
        void syncMyProfile();
      }
    } else {
      const { data, error } = await supabase
        .from('solutions')
        .insert({
          problem_id: problemId,
          week_id: weekId,
          author_id: user.id,
          author_name: displayName,
          body: draft,
        })
        .select('id, problem_id, author_id, author_name, body, created_at, is_correct')
        .maybeSingle();
      if (error) setError(error.message);
      else if (data) {
        setMySolution(data as SolutionRow);
        setDraft('');
        clearDraft();
        void syncMyProfile();
        setConfettiTrigger((t) => t + 1);
        onCorrect?.();
      }
    }
    setSubmitting(false);
  };

  const removeMine = async () => {
    if (!mySolution) return;
    if (!confirm('Delete your solution? This cannot be undone.')) return;
    const { error } = await supabase.from('solutions').delete().eq('id', mySolution.id);
    if (error) setError(error.message);
    else {
      setMySolution(null);
      setCommunity((c) => c.filter((s) => s.id !== mySolution.id));
      clearDraft();
      void syncMyProfile();
    }
  };

  const removeCommunity = async (id: string) => {
    if (!confirm('Delete this community submission? This cannot be undone.')) return;
    const { error } = await supabase.from('solutions').delete().eq('id', id);
    if (error) setError(error.message);
    else setCommunity((c) => c.filter((s) => s.id !== id));
  };

  const toggleCorrect = async (row: SolutionRow, value: boolean) => {
    const { error } = await supabase
      .from('solutions')
      .update({ is_correct: value })
      .eq('id', row.id);
    if (error) {
      setError(error.message);
      return;
    }
    const updated = { ...row, is_correct: value };
    if (row.id === mySolution?.id) setMySolution(updated);
    setCommunity((c) => c.map((s) => (s.id === row.id ? updated : s)));
    void syncMyProfile();
    if (value) onCorrect?.();
    if (value && isHost) {
      const { data: existing } = await supabase
        .from('problems')
        .select('first_blood_user_id')
        .eq('id', row.problem_id)
        .maybeSingle();
      const p = existing as { first_blood_user_id: string | null } | null;
      if (p && !p.first_blood_user_id) {
        await supabase
          .from('problems')
          .update({ first_blood_user_id: row.author_id, first_blood_user_name: row.author_name })
          .eq('id', row.problem_id);
      }
    }
  };

  const insertLatex = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !draft) {
      setDraft('$' + latex + '$' + (draft || ''));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newDraft = draft.slice(0, start) + '$' + latex + '$' + draft.slice(end);
    setDraft(newDraft);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + latex.length + 1);
    }, 0);
  };

  if (!configured) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-4 text-sm text-ink-400">
        <AlertCircle className="mb-1 h-4 w-4 text-yellow-400" />
        Supabase isn't configured. Solution submissions are unavailable in demo mode.
      </div>
    );
  }

  // Visitors who aren't signed in can still write and preview a solution —
  // they just can't submit it until they create an account.
  const isGuest = !user;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-4 lg:sticky lg:top-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-mono text-xs uppercase tracking-wider text-ink-300">
            {mySolution ? 'Your submitted solution' : 'Submit your solution'}
          </h4>
          {mySolution && (
            <span className="font-mono text-[10px] text-accent-300">submitted - editable</span>
          )}
        </div>

        {!mySolution && (
          <div className="mb-3 rounded-md border border-accent-400/20 bg-accent-400/5 px-3 py-2 text-xs text-ink-300">
            Drafts autosave locally every few seconds. Use the submit button below when you want to publish the solution.
          </div>
        )}

        {isGuest && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-accent-400/30 bg-accent-400/5 px-3 py-2 text-xs text-ink-300">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
            <span>You can write and preview your solution here without an account. To submit it and appear on the leaderboard, you'll need to sign in.</span>
          </div>
        )}

        {loadingMine ? (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (!isGuest && mySolution && !draft) ? (
          <div className="space-y-3">
            <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
              <MathText>{mySolution.body}</MathText>
            </div>
            <MediaAttachments targetType="solution" targetId={mySolution.id} editable />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDraft(mySolution.body)}
                className="focus-ring rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
              >
                Edit
              </button>
              <button
                onClick={removeMine}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button
                onClick={() => toggleCorrect(mySolution, !mySolution.is_correct)}
                className={`focus-ring flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition ${
                  mySolution.is_correct
                    ? 'border-accent-400/50 bg-accent-400/15 text-accent-200'
                    : 'border-ink-700 text-ink-300 hover:border-accent-400/40 hover:text-accent-200'
                }`}
                title={isHost ? 'Mark as correct (host)' : 'Mark as correct'}
              >
                <Check className="h-3.5 w-3.5" />
                {mySolution.is_correct ? 'Marked correct' : 'Mark correct'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-ink-700 px-1 pb-2 text-xs text-ink-400">
              <button onClick={() => setViewMode('write')} className={`focus-ring rounded px-2 py-1 ${viewMode === 'write' ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}>
                Write
              </button>
              <button onClick={() => setViewMode('split')} className={`focus-ring rounded px-2 py-1 ${viewMode === 'split' ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}>
                <SplitSquareHorizontal className="mr-1 inline h-3.5 w-3.5" />
                Split
              </button>
              <button onClick={() => setViewMode('preview')} className={`focus-ring rounded px-2 py-1 ${viewMode === 'preview' ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}>
                Preview
              </button>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-ink-500">
                {savedAt ? (
                  <>
                    <Save className="h-3 w-3 text-accent-400" />
                    draft saved {new Date(savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </>
                ) : (
                  'Plain text + Markdown - auto-saves locally'
                )}
              </span>
            </div>

            <div className="mb-3">
              <LaTeXMacros onInsert={insertLatex} />
            </div>

            <div className={`grid gap-3 ${viewMode === 'split' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={SAMPLE}
                rows={viewMode === 'write' ? 18 : 12}
                className="focus-ring min-h-[18rem] w-full resize-y rounded-md border border-ink-700 bg-ink-900 p-3 font-mono text-sm leading-relaxed text-ink-100 placeholder:text-ink-500"
              />
              {viewMode !== 'write' && (
                <div className="min-h-[18rem] overflow-y-auto rounded-md border border-ink-700 bg-ink-900 p-3">
                  {draft.trim() ? (
                    <MathText>{draft}</MathText>
                  ) : (
                    <span className="text-sm text-ink-500">Live preview appears here as you type.</span>
                  )}
                </div>
              )}
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="sticky bottom-3 z-10 mt-2 flex flex-wrap items-center gap-2 rounded-md border border-ink-700 bg-ink-850/95 p-3 backdrop-blur">
              {isGuest ? (
                <>
                  <span className="flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-2 text-xs font-semibold text-accent-200">
                    <Lock className="h-3.5 w-3.5" /> Sign in to submit
                  </span>
                  <span className="text-[11px] text-ink-500">Your draft is saved locally — sign in to publish it.</span>
                </>
              ) : (
                <>
                  <button
                    onClick={submit}
                    disabled={submitting || draft.trim().length < 5}
                    className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-2 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {mySolution ? 'Update solution' : 'Submit solution'}
                  </button>
                  <span className="text-[11px] text-ink-500">
                    {mySolution
                      ? 'Updating replaces your previous submission.'
                      : 'Submitting unlocks community solutions for this problem.'}
                  </span>
                </>
              )}
              <button
                onClick={() => { setDraft(''); clearDraft(); }}
                className="focus-ring ml-auto rounded-md border border-ink-700 px-3 py-2 text-xs text-ink-400 hover:text-ink-200"
              >
                Clear draft
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-4">
        <button
          onClick={() => {
            if (!showCommunity && !mySolution && !isHost) {
              setError('Submit your own solution first to see community solutions.');
              return;
            }
            const next = !showCommunity;
            setShowCommunity(next);
            if (next && community.length === 0) void loadCommunity();
          }}
          disabled={!mySolution && !isHost}
          className="focus-ring flex w-full items-center justify-between gap-2 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-sm text-ink-200">
            {showCommunity ? <Eye className="h-4 w-4 text-accent-400" /> : <EyeOff className="h-4 w-4 text-ink-400" />}
            Community solutions
            {!mySolution && !isHost && (
              <span className="font-mono text-[10px] text-ink-500">(locked until you submit)</span>
            )}
            {isHost && (
              <span className="font-mono text-[10px] text-amber-400">(host view)</span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-ink-400 transition ${showCommunity ? 'rotate-180' : ''}`}
          />
        </button>

        {showCommunity && (
          <div className="mt-4 space-y-3">
            {loadingCommunity ? (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading community solutions...
              </div>
            ) : community.length === 0 ? (
              <p className="text-sm text-ink-400">No community solutions yet. Be the first.</p>
            ) : (
              community.map((s) => (
                <div key={s.id} className="rounded-md border border-ink-700 bg-ink-900 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-accent-300">{s.author_name}</span>
                      {s.is_correct && (
                        <span className="flex items-center gap-1 rounded border border-accent-400/40 bg-accent-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300">
                          <Check className="h-2.5 w-2.5" /> correct
                        </span>
                      )}
                    </span>
                    <span className="text-ink-500">
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <MathText>{s.body}</MathText>
                  <div className="mt-2">
                    <MediaAttachments targetType="solution" targetId={s.id} editable={false} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink-700 pt-2">
                    <button
                      onClick={() => toggleVote(s.id, !!s.my_vote)}
                      disabled={!user}
                      className={`focus-ring flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] uppercase tracking-wider transition disabled:opacity-50 ${
                        s.my_vote
                          ? 'border-accent-400/40 bg-accent-400/10 text-accent-300'
                          : 'border-ink-700 text-ink-400 hover:border-accent-400/40 hover:text-accent-300'
                      }`}
                      title={user ? (s.my_vote ? 'Remove vote' : 'Upvote') : 'Sign in to vote'}
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 15 6-6 6 6" />
                      </svg>
                      {s.my_vote ? 'Voted' : 'Vote'}
                      <span className="font-mono tabular-nums">{s.vote_count ?? 0}</span>
                    </button>
                    {isHost && (
                      <button
                        onClick={() => toggleCorrect(s, !s.is_correct)}
                        className={`focus-ring flex items-center gap-1 rounded border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                          s.is_correct
                            ? 'border-accent-400/40 bg-accent-400/10 text-accent-300'
                            : 'border-ink-700 text-ink-400 hover:border-accent-400/40 hover:text-accent-300'
                        }`}
                      >
                        <Crown className="h-2.5 w-2.5" />
                        {s.is_correct ? 'Unmark correct' : 'Mark correct'}
                      </button>
                    )}
                    {isHost && s.author_id !== user?.id && (
                      <button
                        onClick={() => removeCommunity(s.id)}
                        className="focus-ring flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-[10px] uppercase tracking-wider text-red-300 transition hover:bg-red-500/10"
                        title="Delete this submission (host)"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Delete
                      </button>
                    )}
                  </div>
                  <SolutionComments solutionId={s.id} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <MathConfetti trigger={confettiTrigger} />
    </div>
  );
}
