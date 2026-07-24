// Role-based permission system for ZeroSet.
// Adding a new role only requires adding it to TeamRole and extending the
// permission matrix in can(). No hardcoded emails or user IDs.

import { supabase } from './supabaseClient';

export type TeamRole = 'admin' | 'marketing' | 'community_manager' | 'member';

export interface TeamMember {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: TeamRole;
  assigned_set: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  // Leaderboard fields (sourced from profiles)
  xp: number;
  level: number;
  streak: number;
  solutions_count: number;
  correct_count: number;
  posts_count: number;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: TeamRole;
  assigned_set: string | null;
  invited_by: string | null;
  status: 'pending' | 'applied';
  created_at: string;
  updated_at: string;
}

// Granular permissions checked throughout the app.
export type Permission =
  | 'team.manage'          // manage team members + invitations
  | 'weekly.edit'           // edit official weekly sets
  | 'community.assign'      // assign community sets to managers
  | 'community.edit_own'    // edit own assigned community set
  | 'community.edit_all'   // edit any community set
  | 'analytics.view'        // view analytics
  | 'support.view'          // view support dashboard
  | 'support.respond'       // respond to support
  | 'settings.dev'          // developer / admin settings
  | 'marketing.edit';       // edit marketing content

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  admin: [
    'team.manage',
    'weekly.edit',
    'community.assign',
    'community.edit_own',
    'community.edit_all',
    'analytics.view',
    'support.view',
    'support.respond',
    'settings.dev',
    'marketing.edit',
  ],
  marketing: [
    'support.view',
    'support.respond',
    'marketing.edit',
    'analytics.view',
  ],
  community_manager: [
    'community.edit_own',
  ],
  member: [],
};

export function can(role: TeamRole | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function isAdmin(role: TeamRole | undefined | null): boolean {
  return role === 'admin';
}

export function isStaff(role: TeamRole | undefined | null): boolean {
  return role === 'admin' || role === 'marketing' || role === 'community_manager';
}

// Sidebar links shown to each role. 'member' (regular users) get none.
export interface SidebarLink {
  href: string;
  label: string;
  icon: string;
}

export function sidebarLinksForRole(role: TeamRole | undefined | null): SidebarLink[] {
  if (!role || role === 'member') return [];
  if (role === 'admin') {
    return [
      { href: '/host', label: 'Weekly Sets', icon: 'Layers' },
      { href: '/community', label: 'Community Sets', icon: 'Users' },
      { href: '/team', label: 'Team Management', icon: 'Users' },
      { href: '/host/analytics', label: 'Analytics', icon: 'BarChart3' },
      { href: '/host/support', label: 'Support', icon: 'LifeBuoy' },
      { href: '/me/settings', label: 'Settings', icon: 'Settings' },
    ];
  }
  if (role === 'marketing') {
    return [
      { href: '/host/support', label: 'Support', icon: 'LifeBuoy' },
      { href: '/host/marketing', label: 'Marketing', icon: 'Megaphone' },
      { href: '/host/analytics', label: 'Analytics', icon: 'BarChart3' },
    ];
  }
  if (role === 'community_manager') {
    return [
      { href: '/community', label: 'Community Set Editor', icon: 'Edit3' },
      { href: '/community/drafts', label: 'Drafts', icon: 'FileText' },
    ];
  }
  return [];
}

// Fetch the current user's team_members row.
export async function fetchMyTeamMembership(): Promise<TeamMember | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as TeamMember | null) ?? null;
}

// Auto-create a team_members row for a newly signed-in user if one doesn't
// exist. Checks for a pending invitation by email and applies it.
export async function ensureTeamMembership(email: string, userId: string, fullName?: string): Promise<TeamMember | null> {
  const normEmail = email.trim().toLowerCase();

  // Check for existing record by user_id first
  const { data: existingByUid } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingByUid) return existingByUid as TeamMember;

  // Check for a pre-seeded row matching this email but with null user_id
  // (e.g. the initial admin seed). Link it to this user's id.
  const { data: existingByEmail } = await supabase
    .from('team_members')
    .select('*')
    .eq('email', normEmail)
    .maybeSingle();
  if (existingByEmail) {
    const { data: updated, error } = await supabase
      .from('team_members')
      .update({
        user_id: userId,
        full_name: fullName ?? (existingByEmail as TeamMember).full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existingByEmail as TeamMember).id)
      .select('*')
      .maybeSingle();
    if (!error && updated) return updated as TeamMember;
    // Fall through if the update failed (e.g. RLS)
  }

  // Check for a pending invitation matching this email
  const { data: invite } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('email', normEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (invite) {
    const { data: created, error } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        email: normEmail,
        full_name: fullName ?? null,
        role: (invite as TeamInvitation).role,
        assigned_set: (invite as TeamInvitation).assigned_set,
        invited_by: (invite as TeamInvitation).invited_by,
      })
      .select('*')
      .maybeSingle();
    if (!error && created) {
      await supabase
        .from('team_invitations')
        .update({ status: 'applied', updated_at: new Date().toISOString() })
        .eq('id', (invite as TeamInvitation).id);
      return created as TeamMember;
    }
  }

  // No invitation — create a default 'member' row
  const { data: created } = await supabase
    .from('team_members')
    .insert({
      user_id: userId,
      email: normEmail,
      full_name: fullName ?? null,
      role: 'member',
    })
    .select('*')
    .maybeSingle();
  return (created as TeamMember | null) ?? null;
}

// ── Admin API helpers (all verify role server-side via RLS) ──

export async function listTeamMembers(): Promise<TeamMember[]> {
  // Source from profiles (every sign-up) and left-join team_members (roles).
  // This matches the leaderboard's accurate sign-up count, unlike reading
  // team_members alone which only contains explicitly invited staff.
  const { data: profs } = await supabase
    .from('profiles')
    .select('user_id, display_name, email, created_at, xp, level, streak, solutions_count, correct_count, posts_count')
    .order('created_at', { ascending: false });
  const { data: tm } = await supabase
    .from('team_members')
    .select('*');

  const tmByUserId = new Map<string, TeamMember>();
  for (const row of (tm as TeamMember[]) ?? []) {
    if (row.user_id) tmByUserId.set(row.user_id, row);
  }

  const out: TeamMember[] = [];
  for (const p of (profs ?? []) as Array<{
    user_id: string;
    display_name: string | null;
    email: string | null;
    created_at: string | null;
    xp: number | null;
    level: number | null;
    streak: number | null;
    solutions_count: number | null;
    correct_count: number | null;
    posts_count: number | null;
  }>) {
    const existing = tmByUserId.get(p.user_id);
    const lb = {
      xp: p.xp ?? 0,
      level: p.level ?? 1,
      streak: p.streak ?? 0,
      solutions_count: p.solutions_count ?? 0,
      correct_count: p.correct_count ?? 0,
      posts_count: p.posts_count ?? 0,
    };
    if (existing) {
      out.push({ ...existing, ...lb });
    } else {
      out.push({
        id: p.user_id,
        user_id: p.user_id,
        email: p.email,
        full_name: p.display_name,
        role: 'member' as TeamRole,
        assigned_set: null,
        invited_by: null,
        created_at: p.created_at ?? new Date().toISOString(),
        updated_at: p.created_at ?? new Date().toISOString(),
        ...lb,
      });
    }
  }
  return out;
}

export async function listInvitations(): Promise<TeamInvitation[]> {
  const { data } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (data as TeamInvitation[]) ?? [];
}

export async function inviteTeamMember(
  email: string,
  role: TeamRole,
  assignedSet: string | null,
  invitedBy: string
): Promise<{ error: string | null }> {
  // Upsert the invitation
  const { error } = await supabase
    .from('team_invitations')
    .upsert(
      {
        email: email.trim().toLowerCase(),
        role,
        assigned_set: assignedSet,
        invited_by: invitedBy,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
  if (error) return { error: error.message };

  // If the email already has a team_members row, apply immediately
  const { data: existing } = await supabase
    .from('team_members')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (existing) {
    const { error: updErr } = await supabase
      .from('team_members')
      .update({
        role,
        assigned_set: assignedSet,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as TeamMember).id);
    if (updErr) return { error: updErr.message };
    // Mark invitation as applied
    await supabase
      .from('team_invitations')
      .update({ status: 'applied', updated_at: new Date().toISOString() })
      .eq('email', email.trim().toLowerCase());
  }
  return { error: null };
}

export async function updateMemberRole(
  memberId: string,
  role: TeamRole
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId);
  return { error: error ? error.message : null };
}

export async function assignCommunitySet(
  memberId: string,
  assignedSet: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_members')
    .update({ assigned_set: assignedSet, updated_at: new Date().toISOString() })
    .eq('id', memberId);
  return { error: error ? error.message : null };
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  // Demote to 'member' (removes staff permissions) rather than deleting the row,
  // so the user can still sign in as a regular user.
  const { error } = await supabase
    .from('team_members')
    .update({ role: 'member', assigned_set: null, updated_at: new Date().toISOString() })
    .eq('id', memberId);
  return { error: error ? error.message : null };
}

export async function deleteMember(memberId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);
  return { error: error ? error.message : null };
}

export async function deleteInvitation(invitationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId);
  return { error: error ? error.message : null };
}

export interface UserSearchResult {
  user_id: string;
  email: string | null;
  display_name: string | null;
}

// Look up a user by username (display_name) or email for direct role assignment.
export async function searchUserByQuery(query: string): Promise<UserSearchResult | null> {
  const q = query.trim();
  if (!q) return null;
  const lower = q.toLowerCase();

  // Try email match first (case-insensitive)
  const { data: byEmail } = await supabase
    .from('profiles')
    .select('user_id, email, display_name')
    .ilike('email', lower)
    .maybeSingle();
  if (byEmail) return byEmail as UserSearchResult;

  // Try exact display_name match
  const { data: byName } = await supabase
    .from('profiles')
    .select('user_id, email, display_name')
    .ilike('display_name', q)
    .maybeSingle();
  if (byName) return byName as UserSearchResult;

  // Fuzzy: contains
  const { data: fuzzy } = await supabase
    .from('profiles')
    .select('user_id, email, display_name')
    .ilike('display_name', `%${q}%`)
    .limit(1)
    .maybeSingle();
  return (fuzzy as UserSearchResult) ?? null;
}

// Directly assign a role to an existing user (no email invitation flow).
export async function assignUserRole(
  userId: string,
  email: string | null,
  displayName: string | null,
  role: TeamRole,
  assignedSet: string | null,
  invitedBy: string
): Promise<{ error: string | null }> {
  const normEmail = email ? email.trim().toLowerCase() : null;

  // Check for existing team_members row by user_id
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('team_members')
      .update({
        role,
        assigned_set: assignedSet,
        email: normEmail,
        full_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as { id: string }).id);
    return { error: error ? error.message : null };
  }

  // Insert a new team_members row
  const { error } = await supabase
    .from('team_members')
    .insert({
      user_id: userId,
      email: normEmail,
      full_name: displayName,
      role,
      assigned_set: assignedSet,
      invited_by: invitedBy,
    });
  return { error: error ? error.message : null };
}
