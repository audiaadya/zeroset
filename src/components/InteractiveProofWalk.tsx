import { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Lock, Unlock, Hash, Sparkles, CheckCircle2 } from 'lucide-react';
import MathText from './MathText';

interface Step {
  title: string;
  content: string;
}

interface Props {
  answer: string;
  proof: string;
  unlocked?: boolean;
}

export default function InteractiveProofWalk({ answer, proof, unlocked = false }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState<number[]>(unlocked ? [0, 1, 2, 3] : []);

  if (!unlocked) {
    return (
      <div className="relative rounded-md border border-ink-700 bg-ink-900/60 locked-blur p-4">
        <div className="flex items-center gap-3 text-sm text-ink-400">
          <Lock className="h-4 w-4 text-accent-400" />
          <span>Proof-walk unlocks when the weekly timer hits zero.</span>
        </div>
      </div>
    );
  }

  const steps: Step[] = [
    {
      title: 'The Answer',
      content: answer || 'Answer not available.',
    },
    {
      title: 'Setup & Base Case',
      content: extractSection(proof, 'setup') || 'Initialize the proof structure.',
    },
    {
      title: 'Core Logic',
      content: extractSection(proof, 'core') || proof?.split('\n\n')[0] || 'The main argument.',
    },
    {
      title: 'Conclusion',
      content: extractSection(proof, 'conclusion') || 'Q.E.D.',
    },
  ];

  const revealStep = (index: number) => {
    if (!revealedSteps.includes(index)) {
      setRevealedSteps([...revealedSteps, index]);
      setCurrentStep(index);
    }
  };

  const canView = (index: number) => revealedSteps.includes(index);
  const allRevealed = revealedSteps.length === steps.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-300">
          <BookOpen className="h-3.5 w-3.5 text-accent-400" />
          Interactive Proof-Walk
        </h4>
        {allRevealed && (
          <span className="flex items-center gap-1 text-[10px] text-accent-300">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </span>
        )}
      </div>

      <div className="flex items-start gap-2">
        {steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => canView(idx) && setCurrentStep(idx)}
            className={`focus-ring flex flex-1 flex-col items-center rounded-lg border p-3 transition ${
              currentStep === idx
                ? 'border-accent-400/50 bg-accent-400/10'
                : canView(idx)
                  ? 'border-ink-700 bg-ink-900/50 hover:border-ink-600'
                  : 'border-ink-700/50 bg-ink-850/50 opacity-60'
            }`}
          >
            <span className={`h-6 w-6 rounded-full flex items-center justify-center ${
              canView(idx)
                ? currentStep === idx
                  ? 'bg-accent-400 text-ink-900'
                  : 'bg-ink-700 text-ink-300'
                : 'border border-ink-600 text-ink-500'
            }`}>
              {canView(idx) ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </span>
            <span className="mt-2 text-center text-[10px] uppercase tracking-wider text-ink-400">
              {step.title}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-4">
        {canView(currentStep) ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-accent-300">
              {currentStep === 0 && <Hash className="h-4 w-4" />}
              {currentStep === 1 && <Sparkles className="h-4 w-4" />}
              {currentStep === 2 && <BookOpen className="h-4 w-4" />}
              {currentStep === 3 && <CheckCircle2 className="h-4 w-4" />}
              {steps[currentStep].title}
            </div>
            <MathText>{steps[currentStep].content}</MathText>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-ink-400">
            <Lock className="mx-auto h-6 w-6 mb-2 text-ink-500" />
            Click step {currentStep + 1} to reveal this section.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>

        {!canView(currentStep) && (
          <button
            onClick={() => revealStep(currentStep)}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25"
          >
            <Unlock className="h-3.5 w-3.5" /> Reveal This Step
          </button>
        )}

        <button
          onClick={() => {
            const next = currentStep + 1;
            if (next < steps.length) {
              if (!canView(next)) revealStep(next);
              setCurrentStep(next);
            }
          }}
          disabled={currentStep === steps.length - 1}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function extractSection(proof: string, section: string): string {
  if (!proof) return '';
  const markers: Record<string, RegExp> = {
    setup: /(Base case|Setup|Initialization|Start|Begin|First)[^]*?(\n\n|$)/i,
    core: /(Inductive step|Main|Core|Key|Argument|Assume|Then|Hence)[^]*?(\n\n|$)/i,
    conclusion: /(Therefore|Thus|Q\.?E\.?D|Conclusion|Done|Complete)[^]*$/i,
  };
  const match = proof.match(markers[section]);
  return match ? match[0].trim() : proof;
}
