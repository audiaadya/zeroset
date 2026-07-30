import { supabase, isSupabaseConfigured } from './supabaseClient';

// Fire-and-forget page visit logger. Uses the site_visits table.
function visitorHash(): string {
  const KEY = 'zeroset:vid';
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function logVisit(path: string, userId?: string): void {
  if (!isSupabaseConfigured) return;
  if (!path || path === '/home') return;
  void supabase
    .from('site_visits')
    .insert({
      path,
      visitor_hash: visitorHash(),
      user_id: userId ?? null,
    })
    .then(() => undefined, () => undefined);
}

export interface UserRow {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  xp: number;
  level: number;
  streak: number;
  solutions_count: number;
  correct_count: number;
  posts_count: number;
  referral_source: string | null;
  last_active: string;
  joined_at: string;
}

export interface GameStatsRow {
  user_id: string;
  display_name: string | null;
  solutions: number;
  correct_solutions: number;
  sudden_death_attempts: number;
  sudden_death_correct: number;
  bounties_posted: number;
  bounties_solved: number;
  reverse_eng_prompts: number;
  duels_participated: number;
  duels_won: number;
  forum_threads: number;
  forum_replies: number;
}

export interface ReferralRow {
  source: string;
  user_count: number;
}

export interface ProblemEngagement {
  problemIndex: number;
  problemTitle: string;
  submissions: number;
  correct: number;
  accuracy: number;
}

export interface StreakDistribution {
  streak: string;
  count: number;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  visits7d: number;
  visits30d: number;
  totalSolutions: number;
  correctSolutions: number;
  totalUsers: number;
  totalAuthUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  bountyOpen: number;
  bountySolved: number;
  suddenDeathAttempts: number;
  suddenDeathCorrect: number;
  reverseEngPrompts: number;
  duelsOpen: number;
  duelsCompleted: number;
  forumThreads: number;
  forumReplies: number;
  dailyVisits: { day: string; count: number }[];
  topPaths: { path: string; count: number }[];
  users: UserRow[];
  gameStats: GameStatsRow[];
  referrals: ReferralRow[];
  problemEngagement: ProblemEngagement[];
  streakDistribution: StreakDistribution[];
  weeklyActiveSolvers: number;
  retentionRate: number;
  authUsers: AuthUser[];
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  if (!isSupabaseConfigured) return null;

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    visits,
    visits7,
    visits30,
    sols,
    correctSols,
    profiles,
    newUsers7,
    newUsers30,
    bountyOpen,
    bountySolved,
    sd,
    sdCorrect,
    reverseEng,
    duelsOpen,
    duelsCompleted,
    forumThreads,
    forumReplies,
    usersWithEmails,
    gameStatsData,
    referralData,
    solutionsWithProblem,
    streaksData,
  ] = await Promise.all([
    supabase.from('site_visits').select('id, path, visitor_hash, visited_at'),
    supabase.from('site_visits').select('id').gte('visited_at', d7),
    supabase.from('site_visits').select('id').gte('visited_at', d30),
    supabase.from('solutions').select('id, author_id, created_at, is_correct'),
    supabase.from('solutions').select('id').eq('is_correct', true),
    supabase.from('profiles').select('id, user_id, updated_at'),
    supabase.from('profiles').select('id').gte('updated_at', d7),
    supabase.from('profiles').select('id').gte('updated_at', d30),
    supabase.from('bounty_boards').select('id').eq('status', 'open'),
    supabase.from('bounty_boards').select('id').eq('status', 'solved'),
    supabase.from('sudden_death_submissions').select('id'),
    supabase.from('sudden_death_submissions').select('id').eq('correct', true),
    supabase.from('reverse_eng_prompts').select('id'),
    supabase.from('proof_duels').select('id').eq('status', 'open'),
    supabase.from('proof_duels').select('id').eq('status', 'completed'),
    supabase.from('forum_threads').select('id'),
    supabase.from('forum_replies').select('id'),
    supabase.from('profiles').select('id, user_id, display_name, xp, level, streak, solutions_count, correct_count, posts_count, referral_source, updated_at, email'),
    supabase.from('profiles').select('user_id, display_name, xp, level'),
    supabase.from('profiles').select('referral_source'),
    supabase.from('solutions').select('problem_id, is_correct'),
    supabase.from('profiles').select('streak'),
  ]);

  const allVisits = (visits.data ?? []) as { id: string; path: string; visitor_hash: string | null; visited_at: string }[];
  const uniqueVisitors = new Set(allVisits.map((v) => v.visitor_hash).filter(Boolean)).size;

  // Build daily visit chart (last 14 days)
  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }
  for (const v of allVisits) {
    const key = v.visited_at.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const dailyVisits = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));

  // Top paths
  const pathMap = new Map<string, number>();
  for (const v of allVisits) {
    pathMap.set(v.path, (pathMap.get(v.path) ?? 0) + 1);
  }
  const topPaths = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get user emails by querying auth.users via admin (if available) or using metadata
  // Since we can't directly query auth.users from client, we'll use stored emails from profiles
  // For now, we'll show what we have and note that emails need to be fetched server-side
  const users: UserRow[] = [];

  // Build user list with available data
  if (usersWithEmails.data) {
    for (const p of usersWithEmails.data) {
      users.push({
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        email: '', // Will be filled via separate query
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        streak: p.streak ?? 0,
        solutions_count: p.solutions_count ?? 0,
        correct_count: p.correct_count ?? 0,
        posts_count: p.posts_count ?? 0,
        referral_source: p.referral_source,
        last_active: p.updated_at,
        joined_at: p.updated_at, // Approximate
      });
    }
  }

  // Build game stats per user
  const gameStats: GameStatsRow[] = [];
  if (gameStatsData.data) {
    // We need to query each game table separately and aggregate
    const userIds = gameStatsData.data.map(p => p.user_id);

    const [solutionsByUser, sdByUser, bountyByUser, bountySolvedByUser, reByUser, duelsByUser, duelsWonByUser, threadsByUser, repliesByUser] = await Promise.all([
      supabase.from('solutions').select('author_id').in('author_id', userIds),
      supabase.from('sudden_death_submissions').select('user_id, correct').in('user_id', userIds),
      supabase.from('bounty_boards').select('author_id').in('author_id', userIds),
      supabase.from('bounty_boards').select('solved_by').in('solved_by', userIds).not('solved_by', 'is', null),
      supabase.from('reverse_eng_prompts').select('author_id').in('author_id', userIds),
      supabase.from('proof_duels').select('challenger_id, defender_id').or(`challenger_id.in.(${userIds.join(',')}),defender_id.in.(${userIds.join(',')})`),
      supabase.from('proof_duels').select('winner_id').in('winner_id', userIds).not('winner_id', 'is', null),
      supabase.from('forum_threads').select('author_id').in('author_id', userIds),
      supabase.from('forum_replies').select('author_id').in('author_id', userIds),
    ]);

    // Aggregate stats per user
    const statsMap = new Map<string, GameStatsRow>();
    for (const p of gameStatsData.data) {
      statsMap.set(p.user_id, {
        user_id: p.user_id,
        display_name: p.display_name,
        solutions: 0,
        correct_solutions: 0,
        sudden_death_attempts: 0,
        sudden_death_correct: 0,
        bounties_posted: 0,
        bounties_solved: 0,
        reverse_eng_prompts: 0,
        duels_participated: 0,
        duels_won: 0,
        forum_threads: 0,
        forum_replies: 0,
      });
    }

    // Count solutions
    for (const s of (solutionsByUser.data ?? [])) {
      const stats = statsMap.get(s.author_id);
      if (stats) stats.solutions++;
    }

    // Count sudden death
    for (const sd of (sdByUser.data ?? [])) {
      const stats = statsMap.get(sd.user_id);
      if (stats) {
        stats.sudden_death_attempts++;
        if (sd.correct) stats.sudden_death_correct++;
      }
    }

    // Count bounties posted
    for (const b of (bountyByUser.data ?? [])) {
      const stats = statsMap.get(b.author_id);
      if (stats) stats.bounties_posted++;
    }

    // Count bounties solved
    for (const b of (bountySolvedByUser.data ?? [])) {
      if (b.solved_by) {
        const stats = statsMap.get(b.solved_by);
        if (stats) stats.bounties_solved++;
      }
    }

    // Count reverse eng
    for (const r of (reByUser.data ?? [])) {
      const stats = statsMap.get(r.author_id);
      if (stats) stats.reverse_eng_prompts++;
    }

    // Count duels
    for (const d of (duelsByUser.data ?? [])) {
      if (d.challenger_id) {
        const stats = statsMap.get(d.challenger_id);
        if (stats) stats.duels_participated++;
      }
      if (d.defender_id) {
        const stats = statsMap.get(d.defender_id);
        if (stats) stats.duels_participated++;
      }
    }

    // Count duels won
    for (const d of (duelsWonByUser.data ?? [])) {
      if (d.winner_id) {
        const stats = statsMap.get(d.winner_id);
        if (stats) stats.duels_won++;
      }
    }

    // Count forum threads
    for (const t of (threadsByUser.data ?? [])) {
      const stats = statsMap.get(t.author_id);
      if (stats) stats.forum_threads++;
    }

    // Count forum replies
    for (const r of (repliesByUser.data ?? [])) {
      const stats = statsMap.get(r.author_id);
      if (stats) stats.forum_replies++;
    }

    // Convert to array sorted by XP
    gameStats.push(...Array.from(statsMap.values()).sort((a, b) => (b.solutions + b.sudden_death_attempts * 2) - (a.solutions + a.sudden_death_attempts * 2)));
  }

  // Build referral summary
  const referrals: ReferralRow[] = [];
  const referralMap = new Map<string, number>();
  for (const r of (referralData.data ?? [])) {
    const source = r.referral_source || 'Unknown';
    referralMap.set(source, (referralMap.get(source) ?? 0) + 1);
  }
  for (const [source, count] of Array.from(referralMap.entries()).sort((a, b) => b[1] - a[1])) {
    referrals.push({ source, user_count: count });
  }

  // Problem engagement
  const problemEngagement: ProblemEngagement[] = [];
  const problemMap = new Map<string, { submissions: number; correct: number }>();
  for (const s of (solutionsWithProblem.data ?? [])) {
    const key = s.problem_id;
    const entry = problemMap.get(key) ?? { submissions: 0, correct: 0 };
    entry.submissions++;
    if (s.is_correct) entry.correct++;
    problemMap.set(key, entry);
  }
  for (const [problemId, stats] of problemMap.entries()) {
    problemEngagement.push({
      problemIndex: problemEngagement.length + 1,
      problemTitle: problemId.slice(0, 8),
      submissions: stats.submissions,
      correct: stats.correct,
      accuracy: stats.submissions > 0 ? Math.round((stats.correct / stats.submissions) * 100) : 0,
    });
  }

  // Streak distribution
  const streakDistribution: StreakDistribution[] = [];
  const streakMap = new Map<string, number>();
  for (const p of (streaksData.data ?? [])) {
    const streak = p.streak ?? 0;
    const bucket = streak >= 10 ? '10+ weeks' : streak >= 5 ? '5-9 weeks' : streak >= 2 ? '2-4 weeks' : streak >= 1 ? '1 week' : '0 weeks';
    streakMap.set(bucket, (streakMap.get(bucket) ?? 0) + 1);
  }
  for (const [streak, count] of Array.from(streakMap.entries()).sort((a, b) => b[1] - a[1])) {
    streakDistribution.push({ streak, count });
  }

  // Weekly active solvers = distinct users who submitted a solution in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentAuthorIds = new Set(
    (sols.data ?? [])
      .filter((s) => s.created_at && s.created_at >= sevenDaysAgo && s.author_id)
      .map((s) => s.author_id as string)
  );
  const weeklyActiveSolvers = recentAuthorIds.size;

  // Retention rate = active solvers this week / total registered users
  const totalUsers = (profiles.data ?? []).length;
  const retentionRate = totalUsers > 0
    ? Math.round((weeklyActiveSolvers / totalUsers) * 100)
    : 0;

  return {
    totalVisits: allVisits.length,
    uniqueVisitors,
    visits7d: (visits7.data ?? []).length,
    visits30d: (visits30.data ?? []).length,
    totalSolutions: (sols.data ?? []).length,
    correctSolutions: (correctSols.data ?? []).length,
    totalUsers: (profiles.data ?? []).length,
    totalAuthUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    newUsers7d: (newUsers7.data ?? []).length,
    newUsers30d: (newUsers30.data ?? []).length,
    bountyOpen: (bountyOpen.data ?? []).length,
    bountySolved: (bountySolved.data ?? []).length,
    suddenDeathAttempts: (sd.data ?? []).length,
    suddenDeathCorrect: (sdCorrect.data ?? []).length,
    reverseEngPrompts: (reverseEng.data ?? []).length,
    duelsOpen: (duelsOpen.data ?? []).length,
    duelsCompleted: (duelsCompleted.data ?? []).length,
    forumThreads: (forumThreads.data ?? []).length,
    forumReplies: (forumReplies.data ?? []).length,
    dailyVisits,
    topPaths,
    users,
    gameStats,
    referrals,
    problemEngagement,
    streakDistribution,
    weeklyActiveSolvers,
    retentionRate,
    authUsers: [],
  };
}

// Fetch user emails for analytics (admin only via edge function would be better)
export async function fetchUserEmails(): Promise<Map<string, string>> {
  // This would require a server-side function to access auth.users
  // For now, return empty map - emails would need to be exposed via a secure edge function
  return new Map();
}
