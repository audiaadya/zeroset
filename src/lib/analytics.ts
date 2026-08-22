import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// Local-first event dispatcher
// ---------------------------------------------------------------------------

export type AnalyticsEventType =
  | 'page_view'
  | 'solution_submitted'
  | 'user_signup'
  | 'cta_click';

interface BufferedEvent {
  id: string;
  event_type: AnalyticsEventType;
  event_data: Record<string, unknown>;
  session_id: string;
  created_at: string;
}

const BUFFER_KEY = 'zeroset:analytics_buffer';
const SESSION_KEY = 'zeroset:sid';
const VISITOR_KEY = 'zeroset:vid';
const MAX_BUFFER = 200;

function getSessionId(): string {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function getVisitorId(): string {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

function readBuffer(): BufferedEvent[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as BufferedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: BufferedEvent[]): void {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFER)));
  } catch {
    /* storage full or unavailable — drop silently */
  }
}

let flushing = false;

async function flushBuffer(): Promise<void> {
  if (flushing || !isSupabaseConfigured) return;
  const events = readBuffer();
  if (events.length === 0) return;

  flushing = true;
  const batch = events.slice(0, 50);
  const remaining = events.slice(50);
  writeBuffer(remaining);

  try {
    const { error } = await supabase.from('analytics_events').insert(
      batch.map((e) => ({
        event_type: e.event_type,
        event_data: e.event_data,
        session_id: e.session_id,
        created_at: e.created_at,
      }))
    );
    if (error) {
      // re-buffer the failed batch
      writeBuffer([...batch, ...readBuffer()]);
    }
  } catch {
    writeBuffer([...batch, ...readBuffer()]);
  } finally {
    flushing = false;
  }
}

// Flush on load and every 30 seconds
if (typeof window !== 'undefined') {
  setTimeout(() => void flushBuffer(), 2000);
  setInterval(() => void flushBuffer(), 30000);
  window.addEventListener('beforeunload', () => void flushBuffer());
}

export function trackEvent(
  type: AnalyticsEventType,
  data: Record<string, unknown> = {}
): void {
  const event: BufferedEvent = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    event_type: type,
    event_data: data,
    session_id: getSessionId(),
    created_at: new Date().toISOString(),
  };

  const buffer = readBuffer();
  buffer.push(event);
  writeBuffer(buffer);

  // Fire-and-forget flush
  void flushBuffer();
}

export function trackPageView(path: string): void {
  if (!path || path === '/home') return;
  trackEvent('page_view', { path });
}

export function trackSolutionSubmit(problemId: string, correct: boolean): void {
  trackEvent('solution_submitted', { problem_id: problemId, correct });
}

export function trackSignup(method: string = 'email'): void {
  trackEvent('user_signup', { method });
}

export function trackCTAClick(ctaId: string, location: string = 'unknown'): void {
  trackEvent('cta_click', { cta_id: ctaId, location });
}

// ---------------------------------------------------------------------------
// Legacy visit logger (kept for backward compat with site_visits table)
// ---------------------------------------------------------------------------

function visitorHash(): string {
  return getVisitorId();
}

export function logVisit(path: string, userId?: string): void {
  // New unified event
  trackPageView(path);

  // Legacy site_visits insert
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

// ---------------------------------------------------------------------------
// Unified RPC fetch
// ---------------------------------------------------------------------------

export interface HostDashboardMetrics {
  total_signups: number;
  total_solution_submissions: number;
  correct_solutions: number;
  unique_active_visitors: number;
  total_pageviews: number;
  pageviews_7d: number;
  cta_clicks: number;
  sudden_death_attempts: number;
  sudden_death_correct: number;
  sudden_death_failures: number;
  bounty_open: number;
  bounty_solved: number;
  forum_threads: number;
  forum_replies: number;
  new_users_7d: number;
  new_users_30d: number;
  weekly_active_solvers: number;
  daily_pageviews: { day: string; count: number }[];
  top_paths: { path: string; count: number }[];
  cta_breakdown: { cta_id: string; count: number }[];
}

export async function fetchHostDashboardMetrics(): Promise<HostDashboardMetrics | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase.rpc('get_host_dashboard_analytics');
    if (error || !data) return null;
    return data as HostDashboardMetrics;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fallback: client-side aggregation if RPC fails
// ---------------------------------------------------------------------------

export async function fetchLocalMetrics(): Promise<Partial<HostDashboardMetrics>> {
  if (!isSupabaseConfigured) return {};

  const [sols, correctSols, sd, sdCorrect, bountyOpen, bountySolved, threads, replies, profiles, newUsers7, newUsers30, events] = await Promise.all([
    supabase.from('solutions').select('id, author_id, created_at, is_correct'),
    supabase.from('solutions').select('id').eq('is_correct', true),
    supabase.from('sudden_death_submissions').select('id'),
    supabase.from('sudden_death_submissions').select('id').eq('correct', true),
    supabase.from('bounty_boards').select('id').eq('status', 'open'),
    supabase.from('bounty_boards').select('id').eq('status', 'solved'),
    supabase.from('forum_threads').select('id'),
    supabase.from('forum_replies').select('id'),
    supabase.from('profiles').select('id, created_at'),
    supabase.from('profiles').select('id').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('profiles').select('id').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('analytics_events').select('id, event_type, event_data, session_id, created_at'),
  ]);

  const allEvents = (events.data ?? []) as {
    id: string;
    event_type: string;
    event_data: Record<string, unknown> | null;
    session_id: string | null;
    created_at: string;
  }[];

  const pageViews = allEvents.filter((e) => e.event_type === 'page_view');
  const ctaClicks = allEvents.filter((e) => e.event_type === 'cta_click');
  const uniqueSessions = new Set(pageViews.map((e) => e.session_id).filter(Boolean)).size;

  // Daily pageviews last 14 days
  const now = new Date();
  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of pageViews) {
    const key = e.created_at.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const daily_pageviews = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));

  // Top paths
  const pathMap = new Map<string, number>();
  for (const e of pageViews) {
    const p = (e.event_data?.path as string) ?? 'unknown';
    pathMap.set(p, (pathMap.get(p) ?? 0) + 1);
  }
  const top_paths = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // CTA breakdown
  const ctaMap = new Map<string, number>();
  for (const e of ctaClicks) {
    const c = (e.event_data?.cta_id as string) ?? 'unknown';
    ctaMap.set(c, (ctaMap.get(c) ?? 0) + 1);
  }
  const cta_breakdown = Array.from(ctaMap.entries())
    .map(([cta_id, count]) => ({ cta_id, count }))
    .sort((a, b) => b.count - a.count);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentSolvers = new Set(
    (sols.data ?? [])
      .filter((s: { created_at?: string; author_id?: string }) => s.created_at && s.created_at >= sevenDaysAgo && s.author_id)
      .map((s: { author_id: string }) => s.author_id)
  );

  return {
    total_signups: (profiles.data ?? []).length,
    total_solution_submissions: (sols.data ?? []).length,
    correct_solutions: (correctSols.data ?? []).length,
    unique_active_visitors: uniqueSessions,
    total_pageviews: pageViews.length,
    pageviews_7d: pageViews.filter((e) => e.created_at >= sevenDaysAgo).length,
    cta_clicks: ctaClicks.length,
    sudden_death_attempts: (sd.data ?? []).length,
    sudden_death_correct: (sdCorrect.data ?? []).length,
    sudden_death_failures: (sd.data ?? []).length - (sdCorrect.data ?? []).length,
    bounty_open: (bountyOpen.data ?? []).length,
    bounty_solved: (bountySolved.data ?? []).length,
    forum_threads: (threads.data ?? []).length,
    forum_replies: (replies.data ?? []).length,
    new_users_7d: (newUsers7.data ?? []).length,
    new_users_30d: (newUsers30.data ?? []).length,
    weekly_active_solvers: recentSolvers.size,
    daily_pageviews,
    top_paths,
    cta_breakdown,
  };
}

// ---------------------------------------------------------------------------
// Legacy types & fetch (kept for AnalyticsPage backward compat)
// ---------------------------------------------------------------------------

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
  user_metadata?: { display_name?: string } | null;
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
    visits, visits7, visits30, sols, correctSols, profiles, newUsers7, newUsers30,
    bountyOpen, bountySolved, sd, sdCorrect, reverseEng, duelsOpen, duelsCompleted,
    forumThreads, forumReplies, usersWithEmails, gameStatsData, referralData,
    solutionsWithProblem, streaksData,
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

  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const v of allVisits) {
    const key = v.visited_at.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const dailyVisits = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));

  const pathMap = new Map<string, number>();
  for (const v of allVisits) {
    pathMap.set(v.path, (pathMap.get(v.path) ?? 0) + 1);
  }
  const topPaths = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const users: UserRow[] = [];
  if (usersWithEmails.data) {
    for (const p of usersWithEmails.data) {
      users.push({
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email ?? '',
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        streak: p.streak ?? 0,
        solutions_count: p.solutions_count ?? 0,
        correct_count: p.correct_count ?? 0,
        posts_count: p.posts_count ?? 0,
        referral_source: p.referral_source,
        last_active: p.updated_at,
        joined_at: p.updated_at,
      });
    }
  }

  const gameStats: GameStatsRow[] = [];
  if (gameStatsData.data) {
    const userIds = gameStatsData.data.map((p: { user_id: string }) => p.user_id);
    if (userIds.length > 0) {
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

      const statsMap = new Map<string, GameStatsRow>();
      for (const p of gameStatsData.data) {
        statsMap.set(p.user_id, {
          user_id: p.user_id, display_name: p.display_name,
          solutions: 0, correct_solutions: 0, sudden_death_attempts: 0, sudden_death_correct: 0,
          bounties_posted: 0, bounties_solved: 0, reverse_eng_prompts: 0,
          duels_participated: 0, duels_won: 0, forum_threads: 0, forum_replies: 0,
        });
      }
      for (const s of (solutionsByUser.data ?? [])) {
        const st = statsMap.get((s as { author_id: string }).author_id);
        if (st) st.solutions++;
      }
      for (const sdRow of (sdByUser.data ?? [])) {
        const st = statsMap.get((sdRow as { user_id: string }).user_id);
        if (st) { st.sudden_death_attempts++; if ((sdRow as { correct: boolean }).correct) st.sudden_death_correct++; }
      }
      for (const b of (bountyByUser.data ?? [])) {
        const st = statsMap.get((b as { author_id: string }).author_id);
        if (st) st.bounties_posted++;
      }
      for (const b of (bountySolvedByUser.data ?? [])) {
        const sb = (b as { solved_by: string }).solved_by;
        if (sb) { const st = statsMap.get(sb); if (st) st.bounties_solved++; }
      }
      for (const r of (reByUser.data ?? [])) {
        const st = statsMap.get((r as { author_id: string }).author_id);
        if (st) st.reverse_eng_prompts++;
      }
      for (const d of (duelsByUser.data ?? [])) {
        const c = (d as { challenger_id: string }).challenger_id;
        const df = (d as { defender_id: string }).defender_id;
        if (c) { const st = statsMap.get(c); if (st) st.duels_participated++; }
        if (df) { const st = statsMap.get(df); if (st) st.duels_participated++; }
      }
      for (const d of (duelsWonByUser.data ?? [])) {
        const w = (d as { winner_id: string }).winner_id;
        if (w) { const st = statsMap.get(w); if (st) st.duels_won++; }
      }
      for (const t of (threadsByUser.data ?? [])) {
        const st = statsMap.get((t as { author_id: string }).author_id);
        if (st) st.forum_threads++;
      }
      for (const r of (repliesByUser.data ?? [])) {
        const st = statsMap.get((r as { author_id: string }).author_id);
        if (st) st.forum_replies++;
      }
      gameStats.push(...Array.from(statsMap.values()).sort((a, b) => (b.solutions + b.sudden_death_attempts * 2) - (a.solutions + a.sudden_death_attempts * 2)));
    }
  }

  const referrals: ReferralRow[] = [];
  const referralMap = new Map<string, number>();
  for (const r of (referralData.data ?? [])) {
    const source = (r as { referral_source: string | null }).referral_source || 'Unknown';
    referralMap.set(source, (referralMap.get(source) ?? 0) + 1);
  }
  for (const [source, count] of Array.from(referralMap.entries()).sort((a, b) => b[1] - a[1])) {
    referrals.push({ source, user_count: count });
  }

  const problemEngagement: ProblemEngagement[] = [];
  const problemMap = new Map<string, { submissions: number; correct: number }>();
  for (const s of (solutionsWithProblem.data ?? [])) {
    const key = (s as { problem_id: string }).problem_id;
    const entry = problemMap.get(key) ?? { submissions: 0, correct: 0 };
    entry.submissions++;
    if ((s as { is_correct: boolean }).is_correct) entry.correct++;
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

  const streakDistribution: StreakDistribution[] = [];
  const streakMap = new Map<string, number>();
  for (const p of (streaksData.data ?? [])) {
    const streak = (p as { streak: number | null }).streak ?? 0;
    const bucket = streak >= 10 ? '10+ weeks' : streak >= 5 ? '5-9 weeks' : streak >= 2 ? '2-4 weeks' : streak >= 1 ? '1 week' : '0 weeks';
    streakMap.set(bucket, (streakMap.get(bucket) ?? 0) + 1);
  }
  for (const [streak, count] of Array.from(streakMap.entries()).sort((a, b) => b[1] - a[1])) {
    streakDistribution.push({ streak, count });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentAuthorIds = new Set(
    (sols.data ?? [])
      .filter((s) => (s as { created_at?: string }).created_at && (s as { created_at: string }).created_at >= sevenDaysAgo && (s as { author_id?: string }).author_id)
      .map((s) => (s as { author_id: string }).author_id)
  );
  const weeklyActiveSolvers = recentAuthorIds.size;
  const totalUsers = (profiles.data ?? []).length;
  const retentionRate = totalUsers > 0 ? Math.round((weeklyActiveSolvers / totalUsers) * 100) : 0;

  return {
    totalVisits: allVisits.length,
    uniqueVisitors,
    visits7d: (visits7.data ?? []).length,
    visits30d: (visits30.data ?? []).length,
    totalSolutions: (sols.data ?? []).length,
    correctSolutions: (correctSols.data ?? []).length,
    totalUsers,
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
    forumReplies: (replies.data ?? []).length,
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

export async function fetchUserEmails(): Promise<Map<string, string>> {
  return new Map();
}
