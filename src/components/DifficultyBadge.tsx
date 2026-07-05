import type { Difficulty } from '../lib/types';

const MAP: Record<Difficulty, { label: string; color: string; ring: string; bg: string }> = {
  Accessible: {
    label: 'I · Accessible',
    color: 'text-emerald-300',
    ring: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  Intermediate: {
    label: 'II · Intermediate',
    color: 'text-sky-300',
    ring: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  Advanced: {
    label: 'III · Advanced',
    color: 'text-amber-300',
    ring: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  Hard: {
    label: 'IV · Hard',
    color: 'text-orange-300',
    ring: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
  },
  Olympiad: {
    label: 'V · Olympiad',
    color: 'text-accent-300',
    ring: 'border-accent-400/40',
    bg: 'bg-accent-400/10',
  },
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const s = MAP[difficulty];
  return (
    <span
      className={`inline-flex items-center rounded border ${s.ring} ${s.bg} px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${s.color}`}
    >
      {s.label}
    </span>
  );
}
