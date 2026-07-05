import { useEffect, useState } from 'react';
import { Lock, ChevronDown, ChevronUp, Lightbulb, BookOpen, Droplet } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Problem, WeekSet } from '../lib/types';
import { isWeekUnlocked } from '../data/weeks';
import DifficultyBadge from './DifficultyBadge';
import MathText from './MathText';
import SolutionEditor from './SolutionEditor';

interface Props {
  problem: Problem;
  week: WeekSet;
}

// DB problem ids are UUIDs; seed ids look like "w1-p3".
function isDbId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export default function ProblemCard({ problem, week }: Props) {
  const unlocked = isWeekUnlocked(week);
  const [openSolution, setOpenSolution] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [firstBlood, setFirstBlood] = useState<string | null>(null);

  useEffect(() => {
    if (!isDbId(problem.id)) return;
    (async () => {
      const { data } = await supabase
        .from('problems')
        .select('first_blood_user_name')
        .eq('id', problem.id)
        .maybeSingle();
      if (data) setFirstBlood((data as { first_blood_user_name: string | null }).first_blood_user_name);
    })();
  }, [problem.id]);

  return (
    <article className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850/50 shadow-panel transition hover:border-ink-600">
      <header className="flex flex-col gap-3 border-b border-ink-700 bg-ink-900/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent-400/40 bg-accent-400/10 font-mono text-lg font-semibold text-accent-300">
            {problem.index}
          </div>
          <div>
            <h3 className="font-serif text-xl text-ink-50">{problem.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                {week.title}
              </span>
              {firstBlood && (
                <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-300">
                  <Droplet className="h-2.5 w-2.5" />
                  First blood: {firstBlood}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <MathText>{problem.statement}</MathText>

        {/* Connection note */}
        <div className="rounded-md border border-ink-700/70 bg-ink-900/40 p-3">
          <button
            onClick={() => setShowConnection((v) => !v)}
            className="focus-ring flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-300">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              How this connects to the previous problem
            </span>
            {showConnection ? (
              <ChevronUp className="h-4 w-4 text-ink-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-400" />
            )}
          </button>
          {showConnection && (
            <div className="mt-3 text-sm text-ink-300">
              <MathText>{problem.connection}</MathText>
            </div>
          )}
        </div>

        {/* Solution submission */}
        <div>
          <button
            onClick={() => setOpenSolution((v) => !v)}
            className="focus-ring flex w-full items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900/40 px-3 py-2.5 text-left text-sm text-ink-200 transition hover:border-accent-400/40 hover:text-accent-200"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent-400" />
              {openSolution ? 'Hide solution workspace' : 'Submit your solution'}
            </span>
            {openSolution ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {openSolution && (
            <div className="mt-3">
              <SolutionEditor problemId={problem.id} weekId={week.id} />
            </div>
          )}
        </div>

        {/* Official answer + proof */}
        <div className="relative">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-300">
              <BookOpen className="h-3.5 w-3.5 text-accent-400" />
              Official answer & proof
            </h4>
            {!unlocked && (
              <span className="flex items-center gap-1.5 rounded border border-accent-400/30 bg-accent-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-300">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>
          <div className={`rounded-md border border-ink-700 bg-ink-900/60 p-4 ${!unlocked ? 'locked-blur' : ''}`}>
            <div className="mb-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">Answer</div>
              <MathText>{problem.answer}</MathText>
            </div>
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">Proof</div>
              <MathText>{problem.proof}</MathText>
            </div>
          </div>
          {!unlocked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto rounded-md border border-accent-400/40 bg-ink-900/90 px-4 py-2 text-center text-xs text-ink-300 shadow-glow">
                <Lock className="mb-1 inline h-3.5 w-3.5 text-accent-400" />
                <div>Answers unlock when the weekly timer hits zero.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
