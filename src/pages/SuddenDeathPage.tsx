import { useEffect, useState } from 'react';
import { Zap, Loader2, Lock, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { CURRENT_WEEK } from '../data/weeks';
import { fetchCurrentOfficialSet } from '../lib/sets';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { WeekSet } from '../lib/types';

interface Props {
  navigate: (to: string) => void;
}

interface SuddenDeathRow {
  id: string;
  problem_id: string;
  answer: string;
  correct: boolean | null;
  locked_out: boolean;
  created_at: string;
}

export default function SuddenDeathPage(_props: Props) {
  const { user, configured } = useAuth();
  const [week, setWeek] = useState<WeekSet>(CURRENT_WEEK);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Record<string, SuddenDeathRow>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (isSupabaseConfigured) {
        const db = await fetchCurrentOfficialSet();
        if (db) setWeek(db);
      }
      setLoading(false);
    })();
  }, []);

  const loadSubmissions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('sudden_death_submissions')
      .select('id, problem_id, answer, correct, locked_out, created_at')
      .eq('user_id', user.id)
      .in('problem_id', week.problems.map((p) => p.id));
    const map: Record<string, SuddenDeathRow> = {};
    for (const row of (data ?? []) as SuddenDeathRow[]) {
      map[row.problem_id] = row;
    }
    setSubmissions(map);
  };

  useEffect(() => {
    if (!user || !configured) return;
    void loadSubmissions();
  }, [user, configured, week.id]);

  const submit = async (problemId: string) => {
    if (!user) return;
    const ans = (answers[problemId] ?? '').trim();
    if (!ans) return;
    setBusy(true);
    setError(null);

    // Check if already submitted (UNIQUE constraint protects us too)
    if (submissions[problemId]) {
      setError('You already have a submission for this problem.');
      setBusy(false);
      return;
    }

    const { data, error: insError } = await supabase
      .from('sudden_death_submissions')
      .insert({
        user_id: user.id,
        problem_id: problemId,
        week_id: week.id,
        answer: ans,
      })
      .select('id, problem_id, answer, correct, locked_out, created_at')
      .maybeSingle();

    if (insError) {
      setError(insError.message);
      setBusy(false);
      return;
    }

    // Auto-grade: compare to the official answer (only available if unlocked)
    const problem = week.problems.find((p) => p.id === problemId);
    const officialAnswer = problem?.answer?.trim().toLowerCase() ?? '';
    const isCorrect = officialAnswer.length > 0 && ans.toLowerCase() === officialAnswer;

    const row = data as SuddenDeathRow;
    const updated = { ...row, correct: isCorrect, locked_out: !isCorrect };
    setSubmissions({ ...submissions, [problemId]: updated });

    // Update the row with the grading
    void supabase
      .from('sudden_death_submissions')
      .update({ correct: isCorrect, locked_out: !isCorrect })
      .eq('id', row.id);

    setAnswers({ ...answers, [problemId]: '' });
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
          <Zap className="h-3 w-3" />
          Sudden Death
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Sudden Death Live Queue</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          One shot. One answer. Get it right and your score for that problem is permanently multiplied
          by 1.5x on the global leaderboard. Get it wrong and you are locked out of submitting for the
          rest of the week (you can still read the solution on Sunday).
        </p>
      </header>

      {!user ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-accent-400" />
          <h2 className="mt-4 font-serif text-xl text-ink-100">Sign in to enter Sudden Death</h2>
          <p className="mt-2 text-sm text-ink-400">
            One-shot submissions are tracked per account.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading this week's problems…
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          {week.problems.map((p) => {
            const sub = submissions[p.id];
            const submitted = !!sub;
            const correct = sub?.correct === true;
            const lockedOut = sub?.locked_out === true;
            return (
              <div key={p.id} className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg text-ink-50">
                      Problem {p.index}: {p.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-400">{p.difficulty}</p>
                  </div>
                  {submitted && correct && (
                    <span className="flex items-center gap-1 rounded border border-accent-400/40 bg-accent-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-300">
                      <CheckCircle2 className="h-3 w-3" /> 1.5x locked in
                    </span>
                  )}
                  {submitted && lockedOut && (
                    <span className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-red-300">
                      <XCircle className="h-3 w-3" /> Locked out
                    </span>
                  )}
                </div>

                {submitted ? (
                  <div className="mt-3 rounded-md border border-ink-700 bg-ink-900/50 p-3 text-sm">
                    {correct ? (
                      <div className="text-accent-200">
                        <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                        Correct! Your answer: <span className="font-mono">{sub.answer}</span> — 1.5x multiplier applied.
                      </div>
                    ) : (
                      <div className="text-red-300">
                        <XCircle className="mr-1.5 inline h-4 w-4" />
                        Incorrect. You submitted <span className="font-mono">{sub.answer}</span>. You are
                        locked out of this problem for the rest of the week.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-amber-300">
                      <Clock className="h-3.5 w-3.5" />
                      You have exactly one attempt. Be certain.
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={answers[p.id] ?? ''}
                        onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
                        placeholder="Your numerical answer"
                        className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !busy) void submit(p.id);
                        }}
                      />
                      <button
                        onClick={() => submit(p.id)}
                        disabled={busy || !(answers[p.id] ?? '').trim()}
                        className="focus-ring flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                      >
                        <Zap className="h-4 w-4" /> Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
