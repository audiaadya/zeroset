import { useState } from 'react';
import type { Difficulty } from '../lib/types';

const MAP: Record<Difficulty, { label: string; shortLabel: string; color: string; ring: string; bg: string; glow: string; hex: string; level: number }> = {
  Accessible: {
    label: 'I · Accessible',
    shortLabel: 'I',
    color: 'text-emerald-800',
    ring: 'border-emerald-600',
    bg: 'bg-emerald-50',
    glow: 'rgba(52, 211, 153, 0.4)',
    hex: '#059669',
    level: 1,
  },
  Intermediate: {
    label: 'II · Intermediate',
    shortLabel: 'II',
    color: 'text-sky-800',
    ring: 'border-sky-600',
    bg: 'bg-sky-50',
    glow: 'rgba(56, 189, 248, 0.4)',
    hex: '#0284c7',
    level: 2,
  },
  Advanced: {
    label: 'III · Advanced',
    shortLabel: 'III',
    color: 'text-amber-800',
    ring: 'border-amber-600',
    bg: 'bg-amber-50',
    glow: 'rgba(251, 191, 36, 0.4)',
    hex: '#d97706',
    level: 3,
  },
  Hard: {
    label: 'IV · Hard',
    shortLabel: 'IV',
    color: 'text-orange-800',
    ring: 'border-orange-600',
    bg: 'bg-orange-50',
    glow: 'rgba(249, 115, 22, 0.4)',
    hex: '#ea580c',
    level: 4,
  },
  Olympiad: {
    label: 'V · Olympiad',
    shortLabel: 'V',
    color: 'text-accent-700',
    ring: 'border-accent-500',
    bg: 'bg-accent-50',
    glow: 'rgba(15, 184, 162, 0.4)',
    hex: '#0fb8a2',
    level: 5,
  },
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const s = MAP[difficulty];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center gap-2"
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
              className="w-1 transition-all duration-300"
              style={{
                height: active ? (hovered ? 6 : 4) : 3,
                opacity: active ? 1 : 0.2,
                backgroundColor: active ? s.hex : '#a8765a',
              }}
            />
          );
        })}
      </div>
      <span
        className={`inline-flex items-center border-2 ${s.ring} ${s.bg} px-2 py-0.5 font-handwritten text-xs font-bold uppercase tracking-wider ${s.color} transition-all duration-300 ${hovered ? 'scale-105' : ''}`}
        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
      >
        {s.label}
      </span>
    </div>
  );
}
