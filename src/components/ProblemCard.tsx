import { useEffect, useState, useRef } from 'react';
import { Lock, ChevronDown, ChevronUp, Lightbulb, BookOpen, Droplet, Swords, Pencil, X, Eraser, Undo2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Problem, WeekSet } from '../lib/types';
import { isWeekUnlocked } from '../data/weeks';
import DifficultyBadge from './DifficultyBadge';
import MathText from './MathText';
import SolutionEditor from './SolutionEditor';
import ProblemRating from './ProblemRating';
import ErrorReportButton from './ErrorReportButton';
import InteractiveProofWalk from './InteractiveProofWalk';
import ProblemTags from './ProblemTags';
import ProofDuelArena from './ProofDuelArena';
import MediaAttachments from './MediaAttachments';
import CornerConfetti from './CornerConfetti';

interface Props {
  problem: Problem;
  week: WeekSet;
  climbIndex?: number;
  totalClimb?: number;
  onCorrect?: () => void;
}

function isDbId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const CLIMB_COLORS = [
  'border-l-emerald-400/60',
  'border-l-teal-400/60',
  'border-l-amber-400/60',
  'border-l-orange-400/60',
  'border-l-red-400/60',
];

const CLIMB_WIDTHS = [
  'border-l-2',
  'border-l-2',
  'border-l-[3px]',
  'border-l-[4px]',
  'border-l-[5px]',
];

export default function ProblemCard({ problem, week, climbIndex = 0, totalClimb = 5, onCorrect }: Props) {
  const unlocked = isWeekUnlocked(week);
  const [openSolution, setOpenSolution] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [showProofWalk, setShowProofWalk] = useState(false);
  const [showDuel, setShowDuel] = useState(false);
  const [firstBlood, setFirstBlood] = useState<string | null>(null);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [activeDuelers, setActiveDuelers] = useState(0);

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
    // Simulate live duel counter
    setActiveDuelers(Math.floor(Math.random() * 40) + 5);
  }, [problem.id]);

  return (
    <div data-climb-index={climbIndex} className="relative">
      <CornerConfetti trigger={confettiTrigger} />
      <article
        className={`overflow-hidden rounded-xl border border-ink-700 border-l-[3px] bg-ink-850/50 shadow-panel transition hover:shadow-glow ${CLIMB_COLORS[climbIndex] ?? CLIMB_COLORS[0]} ${CLIMB_WIDTHS[climbIndex] ?? CLIMB_WIDTHS[0]}`}
      >
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
          <div className="flex items-center gap-3">
            <ProblemRating problemId={problem.id} />
            <ErrorReportButton problemId={problem.id} />
          </div>
        </header>

        <div className="space-y-4 p-5">
          <ProblemTags problemId={problem.id} editable={false} />

          <MathText>{problem.statement}</MathText>

          {isDbId(problem.id) && (
            <MediaAttachments targetType="problem" targetId={problem.id} editable={false} />
          )}

          {/* Scratchpad toggle */}
          <button
            onClick={() => setScratchpadOpen(!scratchpadOpen)}
            className="focus-ring flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900/40 px-3 py-2 text-xs text-ink-300 transition hover:border-accent-400/40 hover:text-accent-200"
          >
            <Pencil className="h-3.5 w-3.5" />
            {scratchpadOpen ? 'Hide scratchpad' : 'Open scratchpad'}
          </button>
          {scratchpadOpen && (
            <Scratchpad problemId={problem.id} onClose={() => setScratchpadOpen(false)} />
          )}

          <div className="rounded-md border border-ink-700/70 bg-ink-900/40 p-3">
            <button
              onClick={() => setShowConnection((v) => !v)}
              className="focus-ring flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-300">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                How this connects to the previous problem
              </span>
              {showConnection ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
            </button>
            {showConnection && (
              <div className="mt-3 text-sm text-ink-300">
                <MathText>{problem.connection}</MathText>
              </div>
            )}
          </div>

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
                <SolutionEditor
                  problemId={problem.id}
                  weekId={week.id}
                  onCorrect={() => {
                    setConfettiTrigger((t) => t + 1);
                    onCorrect?.();
                  }}
                />
              </div>
            )}
          </div>

          {/* Proof Duel Arena — distinct arena-style with live counter */}
          <div>
            <button
              onClick={() => setShowDuel((v) => !v)}
              className="focus-ring group flex w-full items-center justify-between gap-2 border-l-2 border-red-500/40 bg-red-500/5 px-3 py-2.5 text-left text-sm text-ink-200 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-200"
            >
              <span className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-400" />
                {showDuel ? 'Hide Proof Duel Arena' : 'Proof Duel Arena'}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-red-300/70">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                {activeDuelers} dueling now
              </span>
            </button>
            {showDuel && (
              <div className="mt-3">
                <ProofDuelArena problem={problem} />
              </div>
            )}
          </div>

          {/* Locked / Unlocked proof section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setShowProofWalk((v) => !v)}
                className="focus-ring flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-300 hover:text-accent-300"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent-400" />
                {showProofWalk ? 'Hide' : 'Show'} Interactive Proof-Walk
              </button>
              {!unlocked && (
                <span className="flex items-center gap-1.5 rounded border border-accent-400/30 bg-accent-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-300">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
            {showProofWalk ? (
              <InteractiveProofWalk answer={problem.answer} proof={problem.proof} unlocked={unlocked} />
            ) : unlocked ? (
              <div className="ink-reveal rounded-md border border-ink-700 bg-ink-900/60 p-4">
                <div className="mb-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">Answer</div>
                  <MathText>{problem.answer}</MathText>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">Proof</div>
                  <MathText>{problem.proof}</MathText>
                </div>
              </div>
            ) : (
              <LockedEnvelope />
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function LockedEnvelope() {
  return (
    <div className="relative overflow-hidden rounded-md border border-ink-700 bg-ink-900/80 p-6">
      {/* Shimmer overlay */}
      <div className="shimmer-bg pointer-events-none absolute inset-0" />
      {/* Redacted document look */}
      <div className="relative space-y-2">
        {[0.85, 0.7, 0.9, 0.6, 0.8, 0.5, 0.75].map((width, i) => (
          <div
            key={i}
            className="h-3 rounded-sm bg-ink-700/60"
            style={{ width: `${width * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-4 flex items-center justify-center gap-2 text-xs text-ink-500">
        <span className="terminal-cursor font-mono uppercase tracking-wider">Sealed until reveal</span>
      </div>
      {/* Wax seal effect */}
      <div className="pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent-400/20 bg-accent-400/5">
        <Lock className="h-4 w-4 text-accent-400/30" />
      </div>
    </div>
  );
}

function Scratchpad({ problemId, onClose }: { problemId: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const storageKey = `zeroset:scratchpad:${problemId}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#22E0C8';
      ctx.lineWidth = 2;
    };
    resize();

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const img = new Image();
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = saved;
    }

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [storageKey]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    setHistory([...history, ctx.getImageData(0, 0, rect.width * dpr, rect.height * dpr)]);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (canvas) localStorage.setItem(storageKey, canvas.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setHistory([]);
    localStorage.removeItem(storageKey);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (history.length === 0) return;
    const last = history[history.length - 1];
    ctx.putImageData(last, 0, 0);
    setHistory(history.slice(0, -1));
    localStorage.setItem(storageKey, canvas.toDataURL());
  };

  return (
    <div className="relative rounded-lg border border-accent-400/20 bg-ink-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
          Scratchpad — saved to your browser
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={!hasDrawn || history.length === 0} className="rounded-md border border-ink-700 p-1.5 text-ink-300 hover:bg-ink-800 disabled:opacity-30" title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={clear} disabled={!hasDrawn} className="rounded-md border border-ink-700 p-1.5 text-ink-300 hover:bg-ink-800 disabled:opacity-30" title="Clear">
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="rounded-md border border-ink-700 p-1.5 text-ink-300 hover:bg-ink-800" title="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        className="h-64 w-full cursor-crosshair rounded-md border border-ink-700 bg-ink-950"
      />
    </div>
  );
}
