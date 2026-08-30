import { supabase } from './supabaseClient';
import type { DbProblem, DbWeekSet, Problem, WeekSet } from './types';
import { ARCHIVE_WEEKS, CURRENT_WEEK } from '../data/weeks';

// Convert a DB week_set + its problems into the frontend WeekSet shape.
export function dbToWeekSet(ws: DbWeekSet, problems: DbProblem[]): WeekSet {
  return {
    id: ws.id,
    weekNumber: ws.week_number ?? 0,
    title: ws.title,
    umbrella: ws.umbrella ?? '',
    description: ws.description ?? '',
    publishDate: ws.publish_at ?? new Date().toISOString(),
    revealDate: ws.reveal_at ?? new Date().toISOString(),
    problems: problems
      .sort((a, b) => a.index - b.index)
      .map((p) => ({
        id: p.id,
        index: p.index,
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        connection: p.connection ?? '',
        answer: p.answer ?? '',
        proof: p.proof ?? '',
      })),
  };
}

// Fetch the current official published set (the most recent published official
// set whose publish_at has passed). Falls back to seed data if none.
export async function fetchCurrentOfficialSet(): Promise<WeekSet | null> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
    .eq('scope', 'official')
    .eq('status', 'published')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const ws = data as DbWeekSet;
  const { data: probs, error: pe } = await supabase
    .from('problems')
    .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
    .eq('set_id', ws.id)
    .order('index', { ascending: true });
  if (pe || !probs) return null;
  return dbToWeekSet(ws, probs as DbProblem[]);
}

// Fetch all published official sets whose reveal_at has passed (archive).
export async function fetchArchivedOfficialSets(): Promise<WeekSet[]> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
    .eq('scope', 'official')
    .eq('status', 'published')
    .lt('reveal_at', new Date().toISOString())
    .order('publish_at', { ascending: false });
  if (error || !data) return [];
  const sets = data as DbWeekSet[];
  const out: WeekSet[] = [];
  for (const ws of sets) {
    const { data: probs } = await supabase
      .from('problems')
      .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
      .eq('set_id', ws.id)
      .order('index', { ascending: true });
    if (probs) out.push(dbToWeekSet(ws, probs as DbProblem[]));
  }
  return out;
}

// Fetch all published community sets (for the /community page).
export async function fetchCommunitySets(): Promise<WeekSet[]> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
    .eq('scope', 'community')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  const sets = data as DbWeekSet[];
  const out: WeekSet[] = [];
  for (const ws of sets) {
    const { data: probs } = await supabase
      .from('problems')
      .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
      .eq('set_id', ws.id)
      .order('index', { ascending: true });
    if (probs) out.push(dbToWeekSet(ws, probs as DbProblem[]));
  }
  return out;
}

export async function fetchCommunitySet(id: string): Promise<WeekSet | null> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const ws = data as DbWeekSet;
  const { data: probs } = await supabase
    .from('problems')
    .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
    .eq('set_id', ws.id)
    .order('index', { ascending: true });
  if (!probs) return null;
  return dbToWeekSet(ws, probs as DbProblem[]);
}

// Fetch the single most popular community set right now (highest trending_score).
export async function fetchTrendingCommunitySet(): Promise<WeekSet | null> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at, trending_score')
    .eq('scope', 'community')
    .eq('status', 'published')
    .order('trending_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const ws = data as DbWeekSet;
  const { data: probs } = await supabase
    .from('problems')
    .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
    .eq('set_id', ws.id)
    .order('index', { ascending: true });
  if (!probs) return null;
  return dbToWeekSet(ws, probs as DbProblem[]);
}

// Fetch the single most recently staff-picked community set.
export async function fetchStaffPickCommunitySet(): Promise<WeekSet | null> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at, staff_pick')
    .eq('scope', 'community')
    .eq('status', 'published')
    .eq('staff_pick', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const ws = data as DbWeekSet;
  const { data: probs } = await supabase
    .from('problems')
    .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
    .eq('set_id', ws.id)
    .order('index', { ascending: true });
  if (!probs) return null;
  return dbToWeekSet(ws, probs as DbProblem[]);
}

// Fetch all sets owned by the current user (drafts + published), for the host dashboard.
export async function fetchMySets(): Promise<{ ws: DbWeekSet; problems: DbProblem[] }[]> {
  const { data, error } = await supabase
    .from('week_sets')
    .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  const sets = data as DbWeekSet[];
  const out: { ws: DbWeekSet; problems: DbProblem[] }[] = [];
  for (const ws of sets) {
    const { data: probs } = await supabase
      .from('problems')
      .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
      .eq('set_id', ws.id)
      .order('index', { ascending: true });
    out.push({ ws, problems: (probs as DbProblem[]) ?? [] });
  }
  return out;
}

// Seed fallback: the static current week + archive from weeks.ts.
export const SEED_CURRENT = CURRENT_WEEK;
export const SEED_ARCHIVE = ARCHIVE_WEEKS;

export function isWeekUnlocked(week: WeekSet): boolean {
  return new Date(week.revealDate).getTime() <= Date.now();
}

export function msUntilReveal(week: WeekSet): number {
  return new Date(week.revealDate).getTime() - Date.now();
}

export function emptyProblem(index: number): Problem {
  return {
    id: '',
    index,
    title: '',
    difficulty: 'Accessible',
    statement: '',
    connection: '',
    answer: '',
    proof: '',
  };
}
