import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Sparkles, Clock, Zap, AlertCircle, CheckCircle2, XCircle, Swords, Lock } from 'lucide-react';
import { CURRENT_WEEK, isWeekUnlocked } from '../data/weeks';
import { fetchCurrentOfficialSet } from '../lib/sets';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { WeekSet } from '../lib/types';
import CountdownTimer from '../components/CountdownTimer';
import ProblemCard from '../components/ProblemCard';
import MockSimulator from '../components/MockSimulator';
import ClimbTracker from '../components/ClimbTracker';

interface Props {
  navigate: (to: string) => void;
}

export default function CurrentWeekPage({ navigate }: Props) {
  const [week, setWeek] = useState<WeekSet>(CURRENT_WEEK);
  const [loading, setLoading] = useState(true);
  const [mockMode, setMockMode] = useState(false);
  const [suddenDeathMode, setSuddenDeathMode] = useState(false);
  const [completedProblems, setCompletedProblems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const db = await fetchCurrentOfficialSet();
      if (db) setWeek(db);
      setLoading(false);
    })();
  }, []);

  const unlocked = isWeekUnlocked(week);

  const markCompleted = (index: number) => {
    setCompletedProblems((prev) => new Set(prev).add(index));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="relative">
      {/* Climb Tracker — sticky vertical dots on the left */}
      <ClimbTracker
        total={week.problems.length}
        completed={completedProblems}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/70 bg-graph-paper bg-radial-accent">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading this week's bundle…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
                <Sparkles className="h-3 w-3" />
                {week.weekNumber ? `Week ${week.weekNumber}` : 'This week'} · {week.umbrella || 'Weekly bundle'}
              </span>
              <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-tight text-ink-50 sm:text-5xl">
                {week.title}
              </h1>
              <p className="max-w-xl text-base text-ink-300">{week.description}</p>
              {/* Academic subtitle replacing metadata cards */}
              <p className="mt-2 font-mono text-xs text-ink-500">
                Published {formatDate(week.publishDate)} · {week.problems.length} problems spanning a steep difficulty climb · Proofs reveal {formatDate(week.revealDate)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Arena actions + problems */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-ink-50">This week's bundle</h2>
            <p className="mt-1 text-sm text-ink-400">
              Five problems, one umbrella topic, a steep climb. Submit your own solutions; official
              proofs unlock when the timer hits zero.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Mock Simulator — clean, minimal */}
            <button
              onClick={() => setMockMode(!mockMode)}
              className={`focus-ring flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition ${
                mockMode
                  ? 'border-accent-400/50 bg-accent-400/10 text-accent-300'
                  : 'border-ink-700 text-ink-400 hover:border-accent-400/40 hover:text-accent-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {mockMode ? 'Exit Mock' : 'Mock Simulator'}
            </button>
            {/* Sudden Death — stark, thin red accent */}
            <button
              onClick={() => setSuddenDeathMode(!suddenDeathMode)}
              className={`focus-ring group flex items-center gap-1.5 px-3 py-1.5 text-xs transition ${
                suddenDeathMode
                  ? 'text-red-300'
                  : 'text-red-400/80 hover:text-red-300'
              }`}
            >
              <span className="h-3 w-px bg-red-500/60 transition group-hover:bg-red-400" />
              <span className="font-mono uppercase tracking-wider">{suddenDeathMode ? 'Exit' : 'Sudden Death'}</span>
            </button>
            <CountdownTimer target={week.revealDate} />
          </div>
        </div>

        {mockMode ? (
          <MockSimulator problems={week.problems} week={week} onComplete={() => setMockMode(false)} />
        ) : suddenDeathMode ? (
          <SuddenDeathMode problems={week.problems} weekId={week.id} onComplete={() => setSuddenDeathMode(false)} />
        ) : (
          <div className="space-y-6">
            {week.problems.map((p, i) => (
              <ProblemCard
                key={p.id}
                problem={p}
                week={week}
                climbIndex={i}
                totalClimb={week.problems.length}
                onCorrect={() => markCompleted(i)}
              />
            ))}
          </div>
        )}

        {unlocked && (
          <div className="mt-8 rounded-lg border border-accent-400/30 bg-accent-400/5 p-4 text-sm text-ink-300">
            This week's answers are now unlocked. The set will move to the{' '}
            <button
              onClick={() => navigate('/archive')}
              className="text-accent-300 underline-offset-2 hover:underline"
            >
              archive
            </button>{' '}
            when the next bundle drops.
          </div>
        )}

        <div className="mt-10 flex flex-col items-start gap-3 rounded-lg border border-ink-700 bg-ink-850/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-lg text-ink-50">Browse past bundles</h3>
            <p className="mt-1 text-sm text-ink-400">
              Past weeks have their official proofs permanently unlocked.
            </p>
          </div>
          <button
            onClick={() => navigate('/archive')}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 transition hover:border-accent-400/40 hover:text-accent-200"
          >
            Open archive <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

function SuddenDeathMode({ problems, weekId, onComplete }: { problems: WeekSet['problems']; weekId: string; onComplete: () => void }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { correct: boolean; answer: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (problemId: string) => {
    if (!user) {
      setError('Sign in to submit your Sudden Death answer and lock in your multiplier.');
      return;
    }
    const ans = (answers[problemId] ?? '').trim();
    if (!ans) return;
    setBusy(true);
    setError(null);

    const problem = problems.find((p) => p.id === problemId);
    const officialAnswer = problem?.answer?.trim().toLowerCase() ?? '';
    const isCorrect = officialAnswer.length > 0 && ans.toLowerCase() === officialAnswer;

    const { error: insError } = await supabase
      .from('sudden_death_submissions')
      .insert({
        user_id: user.id,
        problem_id: problemId,
        week_id: weekId,
        answer: ans,
        correct: isCorrect,
        locked_out: !isCorrect,
      });

    if (insError) {
      setError(insError.message);
      setBusy(false);
      return;
    }

    setResults({ ...results, [problemId]: { correct: isCorrect, answer: ans } });
    setAnswers({ ...answers, [problemId]: '' });
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="border-l-2 border-red-500/50 bg-red-500/5 px-4 py-3 text-sm text-red-200">
        <span className="font-mono uppercase tracking-wider">Sudden Death</span>
        <span className="mx-2 text-ink-600">|</span>
        One shot. One answer. 1.5x multiplier if correct. Locked out for the week if wrong.
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
      {problems.map((p) => {
        const result = results[p.id];
        const submitted = !!result;
        return (
          <div key={p.id} className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-ink-50">Problem {p.index}: {p.title}</h3>
                <p className="mt-1 text-xs text-ink-400">{p.difficulty}</p>
              </div>
              {submitted && result.correct && (
                <span className="flex items-center gap-1 border-l-2 border-accent-400 pl-2 font-mono text-[10px] uppercase tracking-wider text-accent-300">
                  <CheckCircle2 className="h-3 w-3" /> 1.5x locked in
                </span>
              )}
              {submitted && !result.correct && (
                <span className="flex items-center gap-1 border-l-2 border-red-500 pl-2 font-mono text-[10px] uppercase tracking-wider text-red-300">
                  <XCircle className="h-3 w-3" /> Locked out
                </span>
              )}
            </div>
            {submitted ? (
              <div className="mt-3 rounded-md border border-ink-700 bg-ink-900/50 p-3 text-sm">
                {result.correct ? (
                  <span className="text-accent-200">Correct! Answer: <span className="font-mono">{result.answer}</span> — 1.5x multiplier applied.</span>
                ) : (
                  <span className="text-red-300">Incorrect. You submitted <span className="font-mono">{result.answer}</span>. Locked out for the week.</span>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {!user && (
                  <p className="flex items-center gap-1.5 text-xs text-accent-300">
                    <Lock className="h-3.5 w-3.5" /> Sign in to submit your answer.
                  </p>
                )}
                <div className="flex gap-2">
                <input
                  value={answers[p.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
                  placeholder="Your answer"
                  className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void submit(p.id); }}
                />
                <button
                  onClick={() => submit(p.id)}
                  disabled={busy || !(answers[p.id] ?? '').trim()}
                  className="focus-ring flex items-center gap-1.5 border-l-2 border-red-500 bg-red-500/10 px-4 py-2 font-mono text-sm uppercase tracking-wider text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" /> Submit
                </button>
              </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={onComplete}
        className="text-xs text-ink-500 hover:text-ink-300"
      >
        Exit Sudden Death mode
      </button>
    </div>
  );
}
