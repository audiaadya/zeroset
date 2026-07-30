import { useEffect, useState } from 'react';
import { Crown, Zap, Target, Award, Flame, TrendingUp, Swords, Clock, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

export const ACHIEVEMENTS = [
  {
    id: 'novice_calculator',
    name: 'Novice Calculator',
    description: 'Submit your first solution',
    icon: 'Star',
    tier: 1,
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/40',
    requirement: { type: 'solutions', count: 1 },
  },
  {
    id: 'olympiad_contender',
    name: 'Olympiad Contender',
    description: 'Complete 10 problems',
    icon: 'Target',
    tier: 2,
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    requirement: { type: 'solutions', count: 10 },
  },
  {
    id: 'lemma_master',
    name: 'Lemma Master',
    description: 'Get 5 solutions marked correct',
    icon: 'Award',
    tier: 3,
    color: 'text-sky-300',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
    requirement: { type: 'correct', count: 5 },
  },
  {
    id: 'qed_architect',
    name: 'Q.E.D. Architect',
    description: 'Get 25 solutions marked correct',
    icon: 'Crown',
    tier: 4,
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    requirement: { type: 'correct', count: 25 },
  },
  {
    id: 'proof_duelist',
    name: 'Proof Duelist',
    description: 'Win 3 Proof Duels',
    icon: 'Swords',
    tier: 3,
    color: 'text-red-300',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    requirement: { type: 'duels_won', count: 3 },
  },
  {
    id: 'streak_keeper',
    name: 'Streak Keeper',
    description: 'Maintain a 4-week streak',
    icon: 'Flame',
    tier: 2,
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    requirement: { type: 'streak', count: 4 },
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a mock session under time',
    icon: 'Clock',
    tier: 2,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    requirement: { type: 'mock_completed', count: 1 },
  },
  {
    id: 'peer_reviewer',
    name: 'Peer Reviewer',
    description: 'Vote on 10 community proofs',
    icon: 'TrendingUp',
    tier: 2,
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/40',
    requirement: { type: 'votes', count: 10 },
  },
] as const;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Star,
  Target,
  Award,
  Flame,
  Swords,
  Clock,
  TrendingUp,
  Zap,
};

interface Props {
  userId?: string;
  showAll?: boolean;
  compact?: boolean;
}

export default function AchievementBadge({ userId, showAll = false, compact = false }: Props) {
  const { user } = useAuth();
  const [earned, setEarned] = useState<string[]>([]);
  const targetId = userId || user?.id;

  useEffect(() => {
    if (!targetId) return;
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', targetId)
      .then(({ data }) => {
        if (data) setEarned(data.map((d) => d.achievement_id));
      });
  }, [targetId]);

  const visible = showAll ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => earned.includes(a.id));
  const tierOrder = [4, 3, 2, 1];
  const sorted = [...visible].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  if (compact) {
    const highest = sorted[0];
    if (!highest) return null;
    const Icon = ICON_MAP[highest.icon] || Star;
    return (
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${highest.color} ${highest.bgColor} border ${highest.borderColor}`}>
        <Icon className="h-3 w-3" />
        {highest.name}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((a) => {
        const Icon = ICON_MAP[a.icon] || Star;
        const isEarned = earned.includes(a.id);
        return (
          <div
            key={a.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              isEarned
                ? `${a.bgColor} ${a.borderColor}`
                : 'bg-ink-800/30 border-ink-700/50 opacity-50'
            }`}
          >
            <Icon className={`h-4 w-4 ${isEarned ? a.color : 'text-ink-500'}`} />
            <div>
              <div className={`text-xs font-medium ${isEarned ? a.color : 'text-ink-400'}`}>
                {a.name}
              </div>
              <div className="text-[10px] text-ink-500">{a.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function getTierTitle(earnedIds: string[]): string | null {
  const earned = ACHIEVEMENTS.filter((a) => earnedIds.includes(a.id));
  if (earned.length === 0) return null;
  const highest = earned.reduce((max, a) => (a.tier > max.tier ? a : max), earned[0]);
  return highest.name;
}

export function getTierBadge(earnedIds: string[]): { name: string; color: string; bgColor: string; borderColor: string } | null {
  const earned = ACHIEVEMENTS.filter((a) => earnedIds.includes(a.id));
  if (earned.length === 0) return null;
  const highest = earned.reduce((max, a) => (a.tier > max.tier ? a : max), earned[0]);
  return {
    name: highest.name,
    color: highest.color,
    bgColor: highest.bgColor,
    borderColor: highest.borderColor,
  };
}
