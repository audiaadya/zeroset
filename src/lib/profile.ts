import { supabase } from './supabaseClient';
import {
  XP_CORRECT,
  XP_REPLY,
  XP_SOLUTION,
  XP_THREAD,
  isoWeekKey,
  levelFromXp,
  weekDiff,
} from './gamify';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  xp: number;
  level: number;
  streak: number;
  last_activity_week: string | null;
  solutions_count: number;
  correct_count: number;
  posts_count: number;
  updated_at: string;
}

// Recompute and upsert the profile row for the current user from raw tables.
// Call this after any solution/forum action.
export async function syncMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Count solutions
  const { data: sols } = await supabase
    .from('solutions')
    .select('id, is_correct, created_at')
    .eq('author_id', user.id);
  const solutions = (sols ?? []) as { id: string; is_correct: boolean; created_at: string }[];
  const solutionsCount = solutions.length;
  const correctCount = solutions.filter((s) => s.is_correct).length;

  // Count forum posts (threads + replies)
  const { data: threads } = await supabase
    .from('forum_threads')
    .select('id, created_at')
    .eq('author_id', user.id);
  const { data: replies } = await supabase
    .from('forum_replies')
    .select('id, created_at')
    .eq('author_id', user.id);
  const threadCount = (threads ?? []).length;
  const replyCount = (replies ?? []).length;
  const postsCount = threadCount + replyCount;

  // XP
  const xp =
    solutionsCount * XP_SOLUTION +
    correctCount * XP_CORRECT +
    threadCount * XP_THREAD +
    replyCount * XP_REPLY;
  const level = levelFromXp(xp);

  // Streak: consecutive weeks (ending this week or last) with at least one
  // submission. Walk back from the most recent submission week.
  const submissionWeeks = Array.from(
    new Set(solutions.map((s) => isoWeekKey(new Date(s.created_at))))
  ).sort();
  let streak = 0;
  if (submissionWeeks.length > 0) {
    const thisWeek = isoWeekKey();
    const last = submissionWeeks[submissionWeeks.length - 1];
    if (weekDiff(last, thisWeek) <= 1) {
      streak = 1;
      for (let i = submissionWeeks.length - 2; i >= 0; i--) {
        if (weekDiff(submissionWeeks[i], submissionWeeks[i + 1]) === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  const displayName =
    (user.user_metadata as { display_name?: string } | undefined)?.display_name ?? null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        display_name: displayName,
        xp,
        level,
        streak,
        last_activity_week: submissionWeeks[submissionWeeks.length - 1] ?? null,
        solutions_count: solutionsCount,
        correct_count: correctCount,
        posts_count: postsCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('id, user_id, display_name, xp, level, streak, last_activity_week, solutions_count, correct_count, posts_count, updated_at')
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, xp, level, streak, last_activity_week, solutions_count, correct_count, posts_count, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

// Top profiles by XP, for a leaderboard.
export async function fetchLeaderboard(limit = 10): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, xp, level, streak, last_activity_week, solutions_count, correct_count, posts_count, updated_at')
    .order('xp', { ascending: false })
    .limit(limit);
  return (data as Profile[]) ?? [];
}
