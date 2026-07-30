import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Sparkles, Clock, Zap, AlertCircle, CheckCircle2, XCircle, Swords, Lock, Heart } from 'lucide-react';
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
    <div className="relative bg-graph-paper">
      {/* Nonprofit banner */}
      <div className="border-b border-ink-300 bg-cream-200 px-4 pb-3 pt-16 text-center font-handwritten text-xs font-bold uppercase tracking-widest text-ink-600">
        ZeroSet — a nonprofit providing structured, weekly math practice
      </div>

      {/* Climb Tracker — sticky vertical dots on the left */}
      <ClimbTracker
        total={week.problems.length}
        completed={completedProblems}
      />

      {/* Hero — notebook page */}
      <section className="relative overflow-hidden bg-graph-paper">
        <div className="mx-auto max-w-4xl px-4 py-16 pt-8 sm:px-6 sm:py-20">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading this week's bundle…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
                <Sparkles className="h-3.5 w-3.5" />
                {week.weekNumber ? `Week ${week.weekNumber}` : 'This week'} · {week.umbrella || 'Weekly bundle'}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="max-w-2xl font-handwritten text-5xl font-bold leading-tight text-ink-950 sm:text-6xl">
                  {week.title}
                </h1>
                <a
                  href="https://hcb.hackclub.com/donations/start/zeroset"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-sketch-notebook flex shrink-0 items-center gap-2 px-5 py-2.5 font-handwritten text-sm font-bold text-red-600"
                >
                  <Heart className="h-4 w-4" />
                  Donate
                </a>
              </div>
              <p className="max-w-xl text-base text-ink-800">{week.description}</p>
              {/* Academic subtitle replacing metadata cards */}
              <p className="mt-2 font-handwritten text-sm text-ink-600">
                Published {formatDate(week.publishDate)} · {week.problems.length} problems spanning a steep difficulty climb · Proofs reveal {formatDate(week.revealDate)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Arena actions + problems */}
      <section className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="sm:pl-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-handwritten text-3xl font-bold text-ink-950">This week's bundle</h2>
              <p className="mt-1 text-sm text-ink-700">
                Five problems, one umbrella topic, a steep climb. Submit your own solutions; official
                proofs unlock when the timer hits zero.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Mock Simulator — notebook button */}
              <button
                onClick={() => setMockMode(!mockMode)}
                className={`btn-sketch-notebook flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-sm font-bold transition ${
                  mockMode
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : ''
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {mockMode ? 'Exit Mock' : 'Mock Simulator'}
              </button>
              {/* Sudden Death — red accent, hand-drawn */}
              <button
                onClick={() => setSuddenDeathMode(!suddenDeathMode)}
                className={`btn-sketch-notebook flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-sm font-bold transition ${
                  suddenDeathMode
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-red-400 text-red-600 hover:bg-red-50'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                {suddenDeathMode ? 'Exit' : 'Sudden Death'}
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
            <div className="mt-8 sketch-border-sm bg-accent-50 p-4 text-sm text-ink-800">
              This week's answers are now unlocked. The set will move to the{' '}
              <button
                onClick={() => navigate('/archive')}
                className="highlighter font-handwritten font-bold text-accent-700"
              >
                archive
              </button>{' '}
              when the next bundle drops.
            </div>
          )}

          <div className="mt-10 sticky-note flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-handwritten text-xl font-bold text-ink-950">Browse past bundles</h3>
              <p className="mt-1 text-sm text-ink-700">
                Past weeks have their official proofs permanently unlocked.
              </p>
            </div>
            <button
              onClick={() => navigate('/archive')}
              className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold"
            >
              Open archive <ArrowRight className="h-4 w-4" />
            </button>
          </div>
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
      <div className="notebook-margin border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span className="font-handwritten font-bold uppercase tracking-wider">Sudden Death</span>
        <span className="mx-2 text-red-400">|</span>
        One shot. One answer. 1.5x multiplier if correct. Locked out for the week if wrong.
      </div>
      {error && (
        <div className="flex items-start gap-2 sketch-border-sm bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
      {problems.map((p) => {
        const result = results[p.id];
        const submitted = !!result;
        return (
          <div key={p.id} className="index-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-handwritten text-xl font-bold text-ink-950">Problem {p.index}: {p.title}</h3>
                <p className="mt-1 text-xs text-ink-600">{p.difficulty}</p>
              </div>
              {submitted && result.correct && (
                <span className="flex items-center gap-1 border-l-2 border-emerald-600 pl-2 font-handwritten text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> 1.5x locked in
                </span>
              )}
              {submitted && !result.correct && (
                <span className="flex items-center gap-1 border-l-2 border-red-500 pl-2 font-handwritten text-xs font-bold uppercase tracking-wider text-red-700">
                  <XCircle className="h-3 w-3" /> Locked out
                </span>
              )}
            </div>
            {submitted ? (
              <div className="mt-3 sketch-border-sm bg-cream-200 p-3 text-sm text-ink-800">
                {result.correct ? (
                  <span className="text-emerald-700">Correct! Answer: <span className="font-mono">{result.answer}</span> — 1.5x multiplier applied.</span>
                ) : (
                  <span className="text-red-700">Incorrect. You submitted <span className="font-mono">{result.answer}</span>. Locked out for the week.</span>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {!user && (
                  <p className="flex items-center gap-1.5 text-xs text-accent-700">
                    <Lock className="h-3.5 w-3.5" /> Sign in to submit your answer.
                  </p>
                )}
                <div className="flex gap-2">
                <input
                  value={answers[p.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
                  placeholder="Your answer"
                  className="flex-1 border-2 border-ink-400 bg-white px-3 py-2 font-mono text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void submit(p.id); }}
                />
                <button
                  onClick={() => submit(p.id)}
                  disabled={busy || !(answers[p.id] ?? '').trim()}
                  className="btn-sketch-notebook flex items-center gap-1.5 border-2 border-red-500 px-4 py-2 font-handwritten text-sm font-bold uppercase tracking-wider text-red-700 transition hover:bg-red-50 disabled:opacity-50"
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
        className="font-handwritten text-sm text-ink-600 hover:text-accent-700"
      >
        Exit Sudden Death mode
      </button>
    </div>
  );
}
