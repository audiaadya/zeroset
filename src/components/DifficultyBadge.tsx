import { useState } from 'react';
import type { Difficulty } from '../lib/types';

const MAP: Record<Difficulty, { label: string; shortLabel: string; color: string; ring: string; bg: string; glow: string; hex: string; level: number }> = {
  Accessible: {
    label: 'I · Accessible',
    shortLabel: 'I',
    color: 'text-emerald-300',
    ring: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    glow: 'rgba(52, 211, 153, 0.4)',
    hex: '#34d399',
    level: 1,
  },
  Intermediate: {
    label: 'II · Intermediate',
    shortLabel: 'II',
    color: 'text-sky-300',
    ring: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    glow: 'rgba(56, 189, 248, 0.4)',
    hex: '#38bdf8',
    level: 2,
  },
  Advanced: {
    label: 'III · Advanced',
    shortLabel: 'III',
    color: 'text-amber-300',
    ring: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    glow: 'rgba(251, 191, 36, 0.4)',
    hex: '#fbbf24',
    level: 3,
  },
  Hard: {
    label: 'IV · Hard',
    shortLabel: 'IV',
    color: 'text-orange-300',
    ring: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    glow: 'rgba(249, 115, 22, 0.4)',
    hex: '#f97316',
    level: 4,
  },
  Olympiad: {
    label: 'V · Olympiad',
    shortLabel: 'V',
    color: 'text-accent-300',
    ring: 'border-accent-400/40',
    bg: 'bg-accent-400/10',
    glow: 'rgba(34, 224, 200, 0.4)',
    hex: '#22E0C8',
    level: 5,
  },
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const s = MAP[difficulty];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="difficulty-glow relative inline-flex items-center gap-2"
      style={{ ['--glow-color' as string]: s.glow }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Vertical difficulty meter */}
      <div className="flex h-6 flex-col-reverse gap-0.5">
        {[1, 2, 3, 4, 5].map((lvl) => {
          const active = lvl <= s.level;
          return (
            <div
              key={lvl}
              className="w-1 rounded-full transition-all duration-300"
              style={{
                height: active ? (hovered ? 6 : 4) : 3,
                opacity: active ? 1 : 0.2,
                backgroundColor: active ? s.hex : '#2A3450',
              }}
            />
          );
        })}
      </div>
      <span
        className={`inline-flex items-center rounded border ${s.ring} ${s.bg} px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${s.color} transition-all duration-300 ${hovered ? 'scale-105' : ''}`}
      >
        {s.label}
      </span>
    </div>
  );
}
