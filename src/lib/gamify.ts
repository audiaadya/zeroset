// Gamification logic for ZeroSet.
//
// XP rules:
//   +10  submit a solution
//   +25  mark a solution correct (the "you got it right" bonus)
//   +5   create a forum thread
//   +2   post a forum reply
//
// Levels: each level needs level * 100 XP. Level 1 = 0–99, Level 2 = 100–299,
// Level 3 = 300–599, Level N = (N-1)*N/2*100 XP. We use a simple closed form:
//   level = floor((1 + sqrt(1 + 8*xp/100)) / 2)
// and the XP needed for the next level is:
//   nextLevelXp = level * (level + 1) * 100  (cumulative)
//   currentLevelXp = (level - 1) * level * 100

export const XP_SOLUTION = 10;
export const XP_CORRECT = 25;
export const XP_THREAD = 5;
export const XP_REPLY = 2;

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
}

export function levelFloorXp(level: number): number {
  return ((level - 1) * level * 100) / 2;
}

export function nextLevelXp(level: number): number {
  return (level * (level + 1) * 100) / 2;
}

export function progressInLevel(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelFromXp(xp);
  const floor = levelFloorXp(level);
  const ceil = nextLevelXp(level);
  const into = xp - floor;
  const span = ceil - floor;
  const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return { level, into, span, pct };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide name
  earned: boolean;
}

export function computeBadges(stats: {
  solutionsCount: number;
  correctCount: number;
  postsCount: number;
  streak: number;
  level: number;
}): Badge[] {
  return [
    {
      id: 'first-blood',
      name: 'First Blood',
      description: 'Submit your first solution',
      icon: 'Droplet',
      earned: stats.solutionsCount >= 1,
    },
    {
      id: 'five-club',
      name: 'Five Club',
      description: 'Submit 5 solutions',
      icon: 'Hash',
      earned: stats.solutionsCount >= 5,
    },
    {
      id: 'sharp',
      name: 'Sharpshooter',
      description: 'Get 3 solutions marked correct',
      icon: 'Target',
      earned: stats.correctCount >= 3,
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get 10 solutions marked correct',
      icon: 'Award',
      earned: stats.correctCount >= 10,
    },
    {
      id: 'streak-3',
      name: 'On a Roll',
      description: 'Reach a 3-week streak',
      icon: 'Flame',
      earned: stats.streak >= 3,
    },
    {
      id: 'streak-8',
      name: 'Unstoppable',
      description: 'Reach an 8-week streak',
      icon: 'Zap',
      earned: stats.streak >= 8,
    },
    {
      id: 'voice',
      name: 'Voice',
      description: 'Post 10 times in the forum',
      icon: 'MessageSquare',
      earned: stats.postsCount >= 10,
    },
    {
      id: 'level-5',
      name: 'Rising',
      description: 'Reach level 5',
      icon: 'TrendingUp',
      earned: stats.level >= 5,
    },
    {
      id: 'level-10',
      name: 'Mathlete',
      description: 'Reach level 10',
      icon: 'Crown',
      earned: stats.level >= 10,
    },
  ];
}

// ISO week key like '2026-W27'.
export function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function weekDiff(a: string, b: string): number {
  const [ya, wa] = a.split('-W').map(Number);
  const [yb, wb] = b.split('-W').map(Number);
  return (yb - ya) * 52 + (wb - wa);
}
