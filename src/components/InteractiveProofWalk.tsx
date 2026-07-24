import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Check,
  X,
  Sparkles,
  BookOpen,
  Lightbulb,
  Pencil,
  Save,
  Copy,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import MathText from './MathText';
import CornerConfetti from './CornerConfetti';
import { useAuth } from '../lib/AuthContext';

interface Step {
  title: string;
  content: string;
  hint: string;
}

interface Props {
  answer: string;
  proof: string;
  unlocked?: boolean;
}

const PROOF_DELIMITER = '\n\n---\n\n';

function extractSections(proof: string): string[] {
  if (!proof?.trim()) return ['', '', ''];
  const parts = proof.split(PROOF_DELIMITER);
  if (parts.length >= 3) return [parts[0], parts[1], parts.slice(2).join(PROOF_DELIMITER)];
  if (parts.length === 2) return [parts[0], parts[1], ''];
  return [proof, '', ''];
}

export default function InteractiveProofWalk({ answer, proof, unlocked = false }: Props) {
  const { isHost } = useAuth();
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set(unlocked ? [0, 1, 2, 3] : []));
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editAnswer, setEditAnswer] = useState(answer);
  const [editProof, setEditProof] = useState(proof);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [userGuess, setUserGuess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditAnswer(answer);
    setEditProof(proof);
  }, [answer, proof]);

  const [setup, core, conclusion] = extractSections(editProof);

  const steps: Step[] = [
    {
      title: 'The Answer',
      content: editAnswer || 'Answer not available.',
      hint: 'Think about what the final result should be — a number, a formula, or a yes/no.',
    },
    {
      title: 'Setup & Base Case',
      content: setup || 'Initialize the proof structure.',
      hint: 'Start by defining variables and checking the simplest case.',
    },
    {
      title: 'Core Logic',
      content: core || 'The main argument.',
      hint: 'This is the heart of the proof — the key insight or inductive step.',
    },
    {
      title: 'Conclusion',
      content: conclusion || 'Q.E.D.',
      hint: 'Tie everything together to reach the final result.',
    },
  ];

  const totalSteps = steps.length;
  const allCompleted = completed.size === totalSteps;
  const progress = (completed.size / totalSteps) * 100;

  if (!unlocked && !isHost) {
    return (
      <div className="relative rounded-lg border border-ink-700 bg-ink-900/60 p-4">
        <div className="flex items-center gap-3 text-sm text-ink-400">
          <Lock className="h-4 w-4 text-accent-400" />
          <span>Proof-walk unlocks when the weekly timer hits zero.</span>
        </div>
      </div>
    );
  }

  const revealCurrent = () => {
    setRevealed((prev) => new Set(prev).add(step));
  };

  const checkAnswer = () => {
    const correct = normalize(userGuess) === normalize(editAnswer) ||
      normalize(userGuess).length > 0 && normalize(editAnswer).includes(normalize(userGuess));
    if (correct) {
      setFeedback('correct');
      setCompleted((prev) => new Set(prev).add(step));
      setConfettiTrigger((t) => t + 1);
      setTimeout(() => setFeedback(null), 2000);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const nextStep = () => {
    setShowHint(false);
    setUserGuess('');
    setFeedback(null);
    // Auto-complete the current step so the progress counter includes it.
    // This fixes the bug where the first proof step (Setup) was never counted.
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
    if (step < totalSteps - 1) {
      const next = step + 1;
      setStep(next);
      setRevealed((prev) => new Set(prev).add(next));
    }
  };

  const prevStep = () => {
    setShowHint(false);
    setUserGuess('');
    setFeedback(null);
    if (step > 0) setStep(step - 1);
  };

  const reset = () => {
    setStep(0);
    setRevealed(new Set(unlocked ? [0, 1, 2, 3] : [0]));
    setCompleted(new Set());
    setShowHint(false);
    setUserGuess('');
    setFeedback(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Host edit mode
  if (editMode && isHost) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-amber-300">
            <Pencil className="h-3.5 w-3.5" />
            Edit Proof-Walk Content
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(`${editAnswer}\n\n---\n\n${editProof}`)}
              className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-400/40 hover:text-accent-200 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-accent-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy all'}
            </button>
            <button
              onClick={() => { setEditAnswer(answer); setEditProof(proof); setEditMode(false); }}
              className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-red-400/40 hover:text-red-300 transition"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 transition"
            >
              <Save className="h-3.5 w-3.5" /> Done
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-300">Answer</span>
              <button onClick={() => copyToClipboard(editAnswer)} className="flex items-center gap-1 text-[10px] text-ink-500 hover:text-accent-300">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
            </div>
            <textarea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              rows={3}
              placeholder="The final answer. Use $...$ for math."
              className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-graph-paper px-3 py-2 font-mono text-xs text-ink-100"
            />
            <div className="mt-2 rounded-md border border-ink-700 bg-ink-900/60 p-3">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">Preview</div>
              {editAnswer?.trim() ? <MathText>{editAnswer}</MathText> : <span className="text-xs text-ink-600">Preview...</span>}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-300">Proof (separate sections with ---)</span>
              <button onClick={() => copyToClipboard(editProof)} className="flex items-center gap-1 text-[10px] text-ink-500 hover:text-accent-300">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
            </div>
            <textarea
              value={editProof}
              onChange={(e) => setEditProof(e.target.value)}
              rows={8}
              placeholder={"Write the proof here.\nUse $...$ or $$...$$ for math.\nSeparate sections with --- on its own line:\n\nSetup text\n---\nCore argument\n---\nConclusion"}
              className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-graph-paper px-3 py-2 font-mono text-xs text-ink-100"
            />
            <div className="mt-2 rounded-md border border-ink-700 bg-ink-900/60 p-3">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">Preview</div>
              <div className="max-h-32 overflow-y-auto text-sm text-ink-200">
                {editProof?.trim() ? <MathText>{editProof}</MathText> : <span className="text-xs text-ink-600">Preview...</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-ink-700/50 bg-ink-850/40 p-3 text-xs text-ink-400">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Tip:</span>{' '}
          Separate proof sections with <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-accent-300">---</code>{' '}
          on its own line. Each section maps to a step: Setup, Core Logic, Conclusion.
        </div>
      </div>
    );
  }

  const currentStep = steps[step];
  const isRevealed = revealed.has(step);
  const isCompleted = completed.has(step);

  return (
    <div className="space-y-4">
      <CornerConfetti trigger={confettiTrigger} />

      {/* Header with progress bar */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-300">
          <BookOpen className="h-3.5 w-3.5 text-accent-400" />
          Interactive Proof-Walk
        </h4>
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-400/20"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {allCompleted && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-300 correct-burst">
              <Trophy className="h-3 w-3" /> Complete!
            </span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-[10px] text-ink-400 hover:text-ink-200 transition"
            title="Restart"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full border border-ink-700 bg-ink-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-ink-400">
          {completed.size}/{totalSteps}
        </span>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between gap-1.5">
        {steps.map((s, idx) => {
          const done = completed.has(idx);
          const active = step === idx;
          const accessible = revealed.has(idx);
          return (
            <button
              key={idx}
              onClick={() => accessible && setStep(idx)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border p-2.5 transition ${
                active
                  ? 'border-accent-400/50 bg-accent-400/10'
                  : done
                    ? 'border-accent-400/30 bg-accent-400/5'
                    : accessible
                      ? 'border-ink-700 bg-ink-900/50 hover:border-ink-600'
                      : 'border-ink-700/50 bg-ink-850/50 opacity-50'
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                done
                  ? 'bg-accent-400 text-ink-900'
                  : active
                    ? 'border-2 border-accent-400 text-accent-300'
                    : accessible
                      ? 'border border-ink-600 text-ink-400'
                      : 'border border-ink-700 text-ink-600'
              }`}>
                {done ? <Check className="h-4 w-4" /> : accessible ? idx + 1 : <Lock className="h-3 w-3" />}
              </span>
              <span className={`text-center text-[9px] uppercase leading-tight tracking-wider ${
                active ? 'text-accent-300' : done ? 'text-accent-400/70' : 'text-ink-500'
              }`}>
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step content card */}
      <div
        key={step}
        className={`step-pop relative overflow-hidden rounded-xl border bg-ink-900/70 p-5 ${
          feedback === 'correct' ? 'border-accent-400/60 shadow-glow' : feedback === 'wrong' ? 'border-red-500/50 shake' : 'border-ink-700'
        }`}
      >
        {/* Step number badge */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-400/40 bg-accent-400/10 font-mono text-sm font-bold text-accent-300">
              {step + 1}
            </span>
            <div>
              <div className="font-serif text-base text-ink-50">{currentStep.title}</div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-ink-500">
                Step {step + 1} of {totalSteps}
              </div>
            </div>
          </div>
          {isCompleted && (
            <span className="flex items-center gap-1 rounded-md border border-accent-400/40 bg-accent-400/10 px-2 py-1 text-[10px] font-semibold text-accent-300 correct-burst">
              <Check className="h-3 w-3" /> Done
            </span>
          )}
        </div>

        {/* Step 1: Answer input (Duolingo-style) */}
        {step === 0 && !isCompleted ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-300">
              Try to figure out the answer first. Type it below and check your work:
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                placeholder="Type your answer..."
                className={`focus-ring flex-1 rounded-md border bg-graph-paper px-3 py-2.5 font-mono text-sm text-ink-100 placeholder:text-ink-500 ${
                  feedback === 'wrong' ? 'border-red-500/50' : 'border-ink-700'
                }`}
              />
              <button
                onClick={checkAnswer}
                disabled={!userGuess.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Check
              </button>
            </div>
            {feedback === 'correct' && (
              <div className="flex items-center gap-2 rounded-md border border-accent-400/40 bg-accent-400/10 px-3 py-2 text-sm text-accent-200 correct-burst">
                <Sparkles className="h-4 w-4" /> Correct! Nice work.
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <X className="h-4 w-4" /> Not quite. Try again or reveal the answer.
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
              >
                <Lightbulb className="h-3.5 w-3.5" /> {showHint ? 'Hide hint' : 'Show hint'}
              </button>
              <button
                onClick={() => { revealCurrent(); setCompleted((prev) => new Set(prev).add(0)); setConfettiTrigger((t) => t + 1); }}
                className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-accent-300 transition"
              >
                <Unlock className="h-3.5 w-3.5" /> Reveal answer
              </button>
            </div>
            {showHint && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <Lightbulb className="mr-1 inline h-3.5 w-3.5" /> {currentStep.hint}
              </div>
            )}
          </div>
        ) : (
          /* Steps 2-4 and revealed answer: show content — scrollable so long
             explanations never get clipped. */
          <div className="space-y-3">
            <div className="max-h-[420px] overflow-y-auto rounded-md border border-ink-700 bg-ink-850/40 p-4 scrollbar-thin">
              <MathText>{currentStep.content}</MathText>
            </div>
            {isHost && (
              <button
                onClick={() => copyToClipboard(currentStep.content)}
                className="flex items-center gap-1 text-[10px] text-ink-500 hover:text-accent-300"
              >
                {copied ? <Check className="h-3 w-3 text-accent-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy this step'}
              </button>
            )}
            {!isCompleted && step > 0 && (
              <button
                onClick={() => { setCompleted((prev) => new Set(prev).add(step)); setConfettiTrigger((t) => t + 1); }}
                className="flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/25"
              >
                <Check className="h-3.5 w-3.5" /> Mark as understood
              </button>
            )}
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
            >
              <Lightbulb className="h-3.5 w-3.5" /> {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <Lightbulb className="mr-1 inline h-3.5 w-3.5" /> {currentStep.hint}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-ink-300 hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-40 transition"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        <span className="font-mono text-[10px] text-ink-500">
          {isCompleted ? 'Step complete' : isRevealed ? 'Read and mark as understood' : 'Locked'}
        </span>

        <button
          onClick={nextStep}
          disabled={step === totalSteps - 1}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Completion celebration */}
      {allCompleted && (
        <div className="correct-burst rounded-lg border border-accent-400/40 bg-accent-400/10 p-4 text-center">
          <Trophy className="mx-auto h-8 w-8 text-accent-400" />
          <p className="mt-2 font-serif text-lg text-ink-50">Proof complete!</p>
          <p className="mt-1 text-xs text-ink-400">You've walked through every step of the proof.</p>
        </div>
      )}
    </div>
  );
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\$|\\[a-z]+|\s+|[.,;:!?]/g, '').trim();
}
