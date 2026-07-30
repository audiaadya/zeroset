import { useEffect, useState, useRef } from 'react';
import { Lock, ChevronDown, ChevronUp, BookOpen, Droplet, Swords, Pencil, X, Eraser, Undo2, Lightbulb } from 'lucide-react';
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
  'border-l-emerald-500',
  'border-l-sky-500',
  'border-l-amber-500',
  'border-l-orange-500',
  'border-l-accent-500',
];

const CLIMB_WIDTHS = ['border-l-2', 'border-l-2', 'border-l-[3px]', 'border-l-[4px]', 'border-l-[5px]'];

export default function ProblemCard({ problem, week, climbIndex = 0, totalClimb = 5, onCorrect }: Props) {
  const unlocked = isWeekUnlocked(week);
  const [openSolution, setOpenSolution] = useState(false);
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
    setActiveDuelers(Math.floor(Math.random() * 40) + 5);
  }, [problem.id]);

  return (
    <div data-climb-index={climbIndex} className="relative">
      <CornerConfetti trigger={confettiTrigger} />
      <article
        className={`washi-tape relative overflow-visible border-2 border-ink-700 ${CLIMB_COLORS[climbIndex] ?? CLIMB_COLORS[0]} ${CLIMB_WIDTHS[climbIndex] ?? CLIMB_WIDTHS[0]} bg-cream-100 p-5 shadow-panel transition hover:border-ink-600 sm:p-6`}
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
      >
        <header className="mb-4 flex flex-col gap-3 border-b border-ink-300 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-accent-500 bg-accent-50 font-handwritten text-lg font-bold text-accent-700" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
              {problem.index}
            </div>
            <div>
              <h3 className="font-handwritten text-2xl font-bold text-ink-950">{problem.title}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                <span className="highlighter font-handwritten text-xs font-bold uppercase tracking-wider text-ink-800">
                  {week.title}
                </span>
                {firstBlood && (
                  <span className="flex items-center gap-1 border-l-2 border-red-500 pl-2 font-handwritten text-xs font-bold uppercase tracking-wider text-red-700">
                    <Droplet className="h-3 w-3" />
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

        <div className="space-y-4">
          <ProblemTags problemId={problem.id} editable={false} />

          <div className="overflow-hidden">
            {/* Connection sticky note — floated first so prose wraps around it */}
            {problem.connection && problem.connection.trim().length > 0 && (
              <div className="sticky-note shadow-sticky float-right ml-4 mb-3 max-w-[15rem] p-4" style={{ borderRadius: '14px 6px 12px 5px / 6px 12px 5px 14px' }}>
                <div className="mb-1.5 flex items-center gap-1.5 font-handwritten text-xs font-bold uppercase tracking-wider text-teal-700">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Connection
                </div>
                <div className="font-handwritten text-sm text-ink-800">
                  <MathText>{problem.connection}</MathText>
                </div>
              </div>
            )}
            <div className="text-ink-900">
              <MathText>{problem.statement}</MathText>
            </div>
          </div>

          {isDbId(problem.id) && (
            <MediaAttachments targetType="problem" targetId={problem.id} editable={false} />
          )}

          {/* Scratchpad toggle — hand-drawn button */}
          <button
            onClick={() => setScratchpadOpen(!scratchpadOpen)}
            className="btn-sketch-notebook flex items-center gap-2 px-3 py-2 font-handwritten text-sm font-bold"
          >
            <Pencil className="h-3.5 w-3.5" />
            {scratchpadOpen ? 'Hide scratchpad' : 'Open scratchpad'}
          </button>
          {scratchpadOpen && (
            <Scratchpad problemId={problem.id} onClose={() => setScratchpadOpen(false)} />
          )}

          {/* Solution workspace — hand-drawn button, no pill */}
          <div className="border-l-2 border-accent-500 pl-3">
            <button
              onClick={() => setOpenSolution((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 font-handwritten text-sm font-bold text-accent-700">
                <BookOpen className="h-4 w-4 text-accent-600" />
                {openSolution ? 'Hide solution workspace' : 'Submit your solution'}
              </span>
              {openSolution ? <ChevronUp className="h-4 w-4 text-ink-500" /> : <ChevronDown className="h-4 w-4 text-ink-500" />}
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

          {/* Proof Duel Arena — red accent, hand-drawn */}
          <div className="border-l-2 border-red-500/60 pl-3">
            <button
              onClick={() => setShowDuel((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 font-handwritten text-sm font-bold text-red-700">
                <Swords className="h-4 w-4 text-red-500" />
                {showDuel ? 'Hide Proof Duel Arena' : 'Proof Duel Arena'}
              </span>
              <span className="flex items-center gap-1.5 font-handwritten text-xs font-bold uppercase tracking-wider text-red-500/70">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {activeDuelers} dueling now
              </span>
            </button>
            {showDuel && (
              <div className="mt-3">
                <ProofDuelArena problem={problem} />
              </div>
            )}
          </div>

          {/* Proof walk section */}
          <div className="border-l-2 border-ink-400 pl-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setShowProofWalk((v) => !v)}
                className="flex items-center gap-2 font-handwritten text-sm font-bold uppercase tracking-wider text-ink-700"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent-600" />
                {showProofWalk ? 'Hide' : 'Show'} Interactive Proof-Walk
              </button>
              {!unlocked && (
                <span className="flex items-center gap-1.5 highlighter font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
            {showProofWalk ? (
              <InteractiveProofWalk answer={problem.answer} proof={problem.proof} unlocked={unlocked} />
            ) : unlocked ? (
              <div className="ink-reveal sketch-border-sm bg-cream-200 p-4">
                <div className="mb-3">
                  <div className="mb-1 font-handwritten text-xs font-bold uppercase tracking-wider text-ink-600">Answer</div>
                  <MathText>{problem.answer}</MathText>
                </div>
                <div>
                  <div className="mb-1 font-handwritten text-xs font-bold uppercase tracking-wider text-ink-600">Proof</div>
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
    <div className="relative overflow-hidden border-2 border-accent-500 bg-gradient-to-br from-accent-400/20 via-accent-500/15 to-accent-600/20 p-6" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
      <div className="shimmer-bg pointer-events-none absolute inset-0" />
      <div className="relative space-y-2">
        {[0.85, 0.7, 0.9, 0.6, 0.8, 0.5, 0.75].map((width, i) => (
          <div
            key={i}
            className="h-3 bg-accent-600/30"
            style={{ width: `${width * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-4 flex items-center justify-center gap-2 font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
        <Lock className="h-3.5 w-3.5" />
        Sealed until reveal
      </div>
      <div className="pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center border-2 border-accent-500/40 bg-accent-400/10" style={{ borderRadius: '60px 8px 50px 8px / 8px 50px 8px 60px' }}>
        <Lock className="h-4 w-4 text-accent-600/50" />
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
      ctx.strokeStyle = '#0A8C7E';
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
    <div className="relative sketch-border-sm bg-cream-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-handwritten text-xs font-bold uppercase tracking-wider text-ink-600">
          Scratchpad — saved to your browser
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={!hasDrawn || history.length === 0} className="btn-sketch-notebook p-1.5 disabled:opacity-30" title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={clear} disabled={!hasDrawn} className="btn-sketch-notebook p-1.5 disabled:opacity-30" title="Clear">
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="btn-sketch-notebook p-1.5" title="Close">
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
        className="h-64 w-full cursor-crosshair border-2 border-ink-400 bg-white"
      />
    </div>
  );
}
