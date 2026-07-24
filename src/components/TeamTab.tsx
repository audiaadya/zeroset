import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  Shield,
  Megaphone,
  Edit3,
  Trash2,
  X,
  Crown,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Pencil,
  Settings,
  Check,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  type TeamMember,
  type TeamInvitation,
  type TeamRole,
  listTeamMembers,
  listInvitations,
  updateMemberRole,
  assignCommunitySet,
  removeMember,
  deleteMember,
  deleteInvitation,
} from '../lib/permissions';
import { supabase } from '../lib/supabaseClient';

const ASSIGN_EDGE_FUNCTION = 'assign-user-role';
const UPDATE_PROFILE_FUNCTION = 'update-user-profile';

interface CommunitySet {
  id: string;
  title: string;
}

const ROLE_ICONS: Record<TeamRole, typeof Shield> = {
  admin: Shield,
  marketing: Megaphone,
  community_manager: Edit3,
  member: Users,
};

const ROLE_COLORS: Record<TeamRole, string> = {
  admin: 'text-amber-300 border-amber-400/40 bg-amber-400/10',
  marketing: 'text-sky-300 border-sky-400/40 bg-sky-400/10',
  community_manager: 'text-accent-300 border-accent-400/40 bg-accent-400/10',
  member: 'text-ink-400 border-ink-700 bg-ink-850',
};

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  community_manager: 'Community Manager',
  member: 'Member',
};

function roleDescription(role: TeamRole): string {
  switch (role) {
    case 'admin':
      return 'Full access to every feature';
    case 'marketing':
      return 'Support, marketing content, analytics';
    case 'community_manager':
      return 'Edit only their assigned community set';
    case 'member':
      return 'Regular user — no staff permissions';
  }
}

export default function TeamTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [communitySets, setCommunitySets] = useState<CommunitySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('marketing');
  const [inviteSet, setInviteSet] = useState<string>('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const [settingsModal, setSettingsModal] = useState<TeamMember | null>(null);
  const [settingsTab, setSettingsTab] = useState<'role' | 'community' | 'stats' | 'danger'>('role');
  const [roleBusy, setRoleBusy] = useState(false);

  const [assignSet, setAssignSet] = useState<string>('');
  const [assignBusy, setAssignBusy] = useState(false);

  const [profileForm, setProfileForm] = useState({ display_name: '', xp: 0, level: 1, streak: 0, solutions_count: 0, correct_count: 0, posts_count: 0 });
  const [profileBusy, setProfileBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [membs, invs] = await Promise.all([listTeamMembers(), listInvitations()]);
    setMembers(membs);
    setInvitations(invs);
    const { data: sets } = await supabase
      .from('week_sets')
      .select('id, title')
      .eq('scope', 'community')
      .order('title', { ascending: true });
    setCommunitySets((sets as CommunitySet[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.full_name ?? '').toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const handleInvite = async () => {
    if (!inviteQuery.trim() || !user) return;
    setInviteBusy(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      setInviteBusy(false);
      return;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${ASSIGN_EDGE_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: inviteQuery.trim(),
          role: inviteRole,
          assigned_set: inviteRole === 'community_manager' ? (inviteSet || null) : null,
        }),
      }
    );
    const json = await res.json();
    setInviteBusy(false);
    if (!res.ok || json.error) {
      setError(json.error ?? 'Failed to assign role');
      return;
    }
    const label = json.display_name ?? json.email ?? inviteQuery.trim();
    setSuccess(`${label} is now ${ROLE_LABELS[inviteRole]}`);
    setInviteOpen(false);
    setInviteQuery('');
    setInviteRole('marketing');
    setInviteSet('');
    void load();
  };

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    setRoleBusy(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      setRoleBusy(false);
      return;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${ASSIGN_EDGE_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: member.email ?? member.full_name ?? member.user_id,
          role,
          assigned_set: member.assigned_set ?? null,
        }),
      }
    );
    const json = await res.json();
    setRoleBusy(false);
    if (!res.ok || json.error) {
      setError(json.error ?? 'Failed to update role');
      return;
    }
    setSettingsModal({ ...settingsModal, role });
    setSuccess(`Updated ${member.email ?? member.full_name ?? 'user'}'s role to ${ROLE_LABELS[role]}`);
    void load();
  };

  const handleAssign = async () => {
    if (!settingsModal) return;
    setAssignBusy(true);
    const { error: err } = await assignCommunitySet(settingsModal.id, assignSet || null);
    setAssignBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`Assigned community set updated for ${settingsModal.email ?? settingsModal.full_name ?? 'user'}`);
    void load();
  };

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.email ?? member.full_name ?? 'this user'} from the team? They will be demoted to a regular member.`)) return;
    const { error: err } = await removeMember(member.id);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`${member.email ?? member.full_name ?? 'User'} has been removed from the team`);
    setSettingsModal(null);
    void load();
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Permanently delete ${member.email ?? member.full_name ?? 'this user'}'s team access? This cannot be undone.`)) return;
    const { error: err } = await deleteMember(member.id);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`${member.email ?? member.full_name ?? 'User'}'s team access has been deleted`);
    setSettingsModal(null);
    void load();
  };

  const handleDeleteInvite = async (invite: TeamInvitation) => {
    if (!confirm(`Cancel invitation to ${invite.email}?`)) return;
    const { error: err } = await deleteInvitation(invite.id);
    if (err) {
      setError(err);
      return;
    }
    void load();
  };

  const openSettingsModal = (m: TeamMember) => {
    setSettingsModal(m);
    setSettingsTab('role');
    setAssignSet(m.assigned_set ?? '');
    setProfileForm({
      display_name: m.full_name ?? '',
      xp: m.xp ?? 0,
      level: m.level ?? 1,
      streak: m.streak ?? 0,
      solutions_count: m.solutions_count ?? 0,
      correct_count: m.correct_count ?? 0,
      posts_count: m.posts_count ?? 0,
    });
  };

  const handleSaveProfile = async () => {
    if (!settingsModal || !user) return;
    setProfileBusy(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      setProfileBusy(false);
      return;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${UPDATE_PROFILE_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: settingsModal.user_id,
          display_name: profileForm.display_name.trim() || null,
          xp: Number(profileForm.xp),
          level: Number(profileForm.level),
          streak: Number(profileForm.streak),
          solutions_count: Number(profileForm.solutions_count),
          correct_count: Number(profileForm.correct_count),
          posts_count: Number(profileForm.posts_count),
        }),
      }
    );
    const json = await res.json();
    setProfileBusy(false);
    if (!res.ok || json.error) {
      setError(json.error ?? 'Failed to update profile');
      return;
    }
    setSuccess(`Updated ${settingsModal.full_name ?? settingsModal.email ?? 'user'}'s leaderboard stats`);
    setSettingsModal(null);
    void load();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
      </div>
    );
  }

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">Pending Invitations</h3>
          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900/50">
            <div className="divide-y divide-ink-800">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Mail className="h-3.5 w-3.5 text-ink-500" />
                    <div>
                      <div className="text-xs text-ink-100">{inv.email}</div>
                      <div className="text-[10px] text-ink-500">
                        {ROLE_LABELS[inv.role]}{inv.assigned_set && ' · Assigned set'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-500">{formatDate(inv.created_at)}</span>
                    <button onClick={() => handleDeleteInvite(inv)} className="rounded-md p-1 text-red-400 transition hover:bg-red-500/10" title="Cancel invitation">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + Invite button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role…"
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 py-1.5 pl-9 pr-3 text-xs text-ink-100 placeholder-ink-500"
          />
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/25"
        >
          <UserPlus className="h-3.5 w-3.5" /> Invite Member
        </button>
      </div>

      {/* Team table */}
      <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-850/50 text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Assigned Set</th>
                <th className="px-4 py-2.5 text-center font-medium">XP</th>
                <th className="px-4 py-2.5 text-center font-medium">Lvl</th>
                <th className="px-4 py-2.5 text-center font-medium">Streak</th>
                <th className="px-4 py-2.5 text-center font-medium">Solved</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-ink-500">No team members found.</td></tr>
              ) : (
                filtered.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role] ?? Users;
                  const assignedSetTitle = communitySets.find((s) => s.id === m.assigned_set)?.title ?? null;
                  const isSelf = m.user_id === user?.id;
                  return (
                    <tr key={m.id} className="transition hover:bg-ink-850/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/15 font-mono text-[10px] font-semibold text-accent-300">
                            {(m.full_name ?? m.email ?? '?')[0]?.toUpperCase()}
                          </span>
                          <div>
                            <div className="text-ink-100">{m.full_name ?? '—'}</div>
                            {isSelf && <span className="text-[9px] text-ink-500">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-300">{m.email ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[m.role]}`}>
                          <RoleIcon className="h-2.5 w-2.5" />{ROLE_LABELS[m.role]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-300">
                        {assignedSetTitle ? assignedSetTitle : <span className="text-ink-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="font-mono text-xs tabular-nums text-ink-200">{m.xp.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-300">
                          <Trophy className="h-2.5 w-2.5 text-amber-400" />{m.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="font-mono text-xs tabular-nums text-ink-300">{m.streak}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="font-mono text-xs tabular-nums text-ink-300">{m.solutions_count}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-ink-400">
                          <Calendar className="h-2.5 w-2.5" />{formatDate(m.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openSettingsModal(m)} className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-accent-300" title="Settings & permissions">
                            <Settings className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteOpen && (
        <Modal onClose={() => setInviteOpen(false)} title="Assign Team Member">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Username or Email</label>
              <input
                type="text"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="username or email@example.com"
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder-ink-500"
              />
              <p className="mt-1 text-[10px] text-ink-500">Enter an existing user's username or email. We'll look them up and assign the role directly.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'marketing', 'community_manager'] as TeamRole[]).map((r) => {
                  const Icon = ROLE_ICONS[r];
                  return (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs transition ${
                        inviteRole === r
                          ? 'border-accent-400 bg-accent-400/15 text-accent-200'
                          : 'border-ink-700 bg-ink-900 text-ink-400 hover:border-ink-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />{ROLE_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </div>
            {inviteRole === 'community_manager' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-400">Assigned Community Set (optional)</label>
                <select
                  value={inviteSet}
                  onChange={(e) => setInviteSet(e.target.value)}
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                >
                  <option value="">— None —</option>
                  {communitySets.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setInviteOpen(false)} className="rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-300 hover:bg-ink-800">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={!inviteQuery.trim() || inviteBusy}
                className="flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/30 disabled:opacity-50"
              >
                {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Assign Role
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Settings & Permissions Modal */}
      {settingsModal && (
        <Modal onClose={() => setSettingsModal(null)} title={`Settings — ${settingsModal.full_name ?? settingsModal.email ?? 'user'}`}>
          <div>
            {/* Tabs */}
            <div className="mb-4 flex gap-1 border-b border-ink-700">
              {([
                { key: 'role', label: 'Role & Permissions', icon: Shield },
                { key: 'community', label: 'Community Set', icon: Edit3 },
                { key: 'stats', label: 'Leaderboard Stats', icon: Trophy },
                { key: 'danger', label: 'Danger Zone', icon: AlertCircle },
              ] as const).map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSettingsTab(tab.key)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
                      settingsTab === tab.key
                        ? 'border-accent-400 text-accent-200'
                        : 'border-transparent text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />{tab.label}
                  </button>
                );
              })}
            </div>

            {/* Role tab */}
            {settingsTab === 'role' && (
              <div className="space-y-2">
                <p className="mb-2 text-[11px] text-ink-500">Select a role to change what this user can do on the site.</p>
                {(['admin', 'marketing', 'community_manager', 'member'] as TeamRole[]).map((r) => {
                  const Icon = ROLE_ICONS[r];
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(settingsModal, r)}
                      disabled={roleBusy}
                      className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${
                        settingsModal.role === r
                          ? 'border-accent-400 bg-accent-400/10 text-accent-200'
                          : 'border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{ROLE_LABELS[r]}</div>
                        <div className="text-xs text-ink-500">{roleDescription(r)}</div>
                      </div>
                      {settingsModal.role === r && <Crown className="ml-auto h-4 w-4 text-amber-300" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Community Set tab */}
            {settingsTab === 'community' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-400">Assigned Community Set</label>
                  <select
                    value={assignSet}
                    onChange={(e) => setAssignSet(e.target.value)}
                    className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                  >
                    <option value="">— None —</option>
                    {communitySets.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-ink-500">Only applies if the user is a Community Manager.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleAssign}
                    disabled={assignBusy}
                    className="flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/30 disabled:opacity-50"
                  >
                    {assignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Assignment
                  </button>
                </div>
              </div>
            )}

            {/* Stats tab */}
            {settingsTab === 'stats' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-400">Display Name</label>
                  <input
                    type="text"
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                    className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">XP</label>
                    <input type="number" value={profileForm.xp} onChange={(e) => setProfileForm({ ...profileForm, xp: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">Level</label>
                    <input type="number" value={profileForm.level} onChange={(e) => setProfileForm({ ...profileForm, level: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">Streak</label>
                    <input type="number" value={profileForm.streak} onChange={(e) => setProfileForm({ ...profileForm, streak: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">Solutions</label>
                    <input type="number" value={profileForm.solutions_count} onChange={(e) => setProfileForm({ ...profileForm, solutions_count: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">Correct</label>
                    <input type="number" value={profileForm.correct_count} onChange={(e) => setProfileForm({ ...profileForm, correct_count: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">Posts</label>
                    <input type="number" value={profileForm.posts_count} onChange={(e) => setProfileForm({ ...profileForm, posts_count: Number(e.target.value) })} className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100" />
                  </div>
                </div>
                <p className="text-[10px] text-ink-500">These values override the auto-computed leaderboard stats for this user.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileBusy}
                    className="flex items-center gap-2 rounded-md border border-amber-400 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/30 disabled:opacity-50"
                  >
                    {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Save Stats
                  </button>
                </div>
              </div>
            )}

            {/* Danger Zone tab */}
            {settingsTab === 'danger' && (
              <div className="space-y-3">
                <p className="text-[11px] text-ink-500">These actions revoke this user's staff access. They will still be able to sign in as a regular user.</p>
                <button
                  onClick={() => handleRemove(settingsModal)}
                  disabled={settingsModal.user_id === user?.id}
                  className="flex w-full items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                >
                  <UserPlus className="h-4 w-4 rotate-45" /> Demote to regular member
                </button>
                <button
                  onClick={() => handleDelete(settingsModal)}
                  disabled={settingsModal.user_id === user?.id}
                  className="flex w-full items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete team access permanently
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-deep" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink-50">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-800"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
