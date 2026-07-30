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
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  type TeamMember,
  type TeamInvitation,
  type TeamRole,
  listTeamMembers,
  listInvitations,
  inviteTeamMember,
  updateMemberRole,
  assignCommunitySet,
  removeMember,
  deleteMember,
  deleteInvitation,
  isAdmin,
} from '../lib/permissions';
import { supabase } from '../lib/supabaseClient';

interface Props {
  navigate: (to: string) => void;
}

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

export default function TeamManagementPage({ navigate }: Props) {
  const { user, teamRole, teamMember } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [communitySets, setCommunitySets] = useState<CommunitySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('marketing');
  const [inviteSet, setInviteSet] = useState<string>('');
  const [inviteBusy, setInviteBusy] = useState(false);

  // Role change modal
  const [roleModal, setRoleModal] = useState<TeamMember | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);

  // Assign set modal
  const [assignModal, setAssignModal] = useState<TeamMember | null>(null);
  const [assignSet, setAssignSet] = useState<string>('');
  const [assignBusy, setAssignBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [membs, invs] = await Promise.all([listTeamMembers(), listInvitations()]);
    setMembers(membs);
    setInvitations(invs);
    // Load community sets for assignment dropdown
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

  // Clear success/error after a few seconds
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
    if (!inviteEmail.trim() || !user) return;
    setInviteBusy(true);
    setError(null);
    const { error: err } = await inviteTeamMember(
      inviteEmail.trim(),
      inviteRole,
      inviteRole === 'community_manager' ? (inviteSet || null) : null,
      user.id
    );
    setInviteBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`Invitation sent to ${inviteEmail.trim()}`);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('marketing');
    setInviteSet('');
    void load();
  };

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    setRoleBusy(true);
    const { error: err } = await updateMemberRole(member.id, role);
    setRoleBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setRoleModal(null);
    setSuccess(`Updated ${member.email}'s role to ${ROLE_LABELS[role]}`);
    void load();
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    setAssignBusy(true);
    const { error: err } = await assignCommunitySet(assignModal.id, assignSet || null);
    setAssignBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setAssignModal(null);
    setSuccess(`Assigned community set updated for ${assignModal.email}`);
    void load();
  };

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.email} from the team? They will be demoted to a regular member.`)) return;
    const { error: err } = await removeMember(member.id);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`${member.email} has been removed from the team`);
    void load();
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Permanently delete ${member.email}'s team access? This cannot be undone.`)) return;
    const { error: err } = await deleteMember(member.id);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(`${member.email}'s team access has been deleted`);
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

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Guard: only admins can access this page
  if (!loading && !isAdmin(teamRole)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <Shield className="mx-auto h-12 w-12 text-red-400/60" />
        <h2 className="mt-4 font-serif text-3xl italic text-ink-50">403 — Access Denied</h2>
        <p className="mt-2 text-sm text-ink-400">
          You need administrator permissions to view the Team Management page.
        </p>
        <button
          onClick={() => navigate('/current-week')}
          className="mt-4 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
        >
          Back to current week
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl italic text-ink-50">Team Management</h1>
          <p className="mt-1 text-sm text-ink-400">
            Manage staff members, roles, and permissions.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/30"
        >
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-xl text-ink-100">Pending Invitations</h2>
          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900/50">
            <div className="divide-y divide-ink-800">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-ink-500" />
                    <div>
                      <div className="text-sm text-ink-100">{inv.email}</div>
                      <div className="text-xs text-ink-500">
                        {ROLE_LABELS[inv.role]}
                        {inv.assigned_set && ' · Assigned set'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500">{formatDate(inv.created_at)}</span>
                    <button
                      onClick={() => handleDeleteInvite(inv)}
                      className="rounded-md p-1.5 text-red-400 transition hover:bg-red-500/10"
                      title="Cancel invitation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 py-2 pl-10 pr-3 text-sm text-ink-100 placeholder-ink-500"
          />
        </div>
      </div>

      {/* Team table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-ink-700 bg-ink-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-850/50 text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Assigned Set</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                    No team members found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role] ?? Users;
                  const assignedSetTitle =
                    communitySets.find((s) => s.id === m.assigned_set)?.title ?? null;
                  const isSelf = m.user_id === user?.id;
                  return (
                    <tr key={m.id} className="transition hover:bg-ink-850/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-400/15 font-mono text-xs font-semibold text-accent-300">
                            {(m.full_name ?? m.email ?? '?')[0]?.toUpperCase()}
                          </span>
                          <div>
                            <div className="text-ink-100">{m.full_name ?? '—'}</div>
                            {isSelf && (
                              <span className="text-[10px] text-ink-500">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-300">{m.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role]}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[m.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-300">
                        {assignedSetTitle ? (
                          <span className="text-xs">{assignedSetTitle}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-400">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {formatDate(m.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setRoleModal(m)}
                            className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-accent-300"
                            title="Change role"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setAssignModal(m);
                              setAssignSet(m.assigned_set ?? '');
                            }}
                            className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-accent-300"
                            title="Assign community set"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemove(m)}
                            disabled={isSelf}
                            className="rounded-md p-1.5 text-ink-400 transition hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
                            title="Remove permissions"
                          >
                            <UserPlus className="h-3.5 w-3.5 rotate-45" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            disabled={isSelf}
                            className="rounded-md p-1.5 text-ink-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                            title="Delete team access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        <Modal onClose={() => setInviteOpen(false)} title="Invite Team Member">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder-ink-500"
              />
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
                      <Icon className="h-4 w-4" />
                      {ROLE_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </div>
            {inviteRole === 'community_manager' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-400">
                  Assigned Community Set (optional)
                </label>
                <select
                  value={inviteSet}
                  onChange={(e) => setAssignSet(e.target.value)}
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                >
                  <option value="">— None —</option>
                  {communitySets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-300 hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteBusy}
                className="flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/30 disabled:opacity-50"
              >
                {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Invitation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <Modal onClose={() => setRoleModal(null)} title={`Change role — ${roleModal.email}`}>
          <div className="space-y-3">
            {(['admin', 'marketing', 'community_manager', 'member'] as TeamRole[]).map((r) => {
              const Icon = ROLE_ICONS[r];
              return (
                <button
                  key={r}
                  onClick={() => handleRoleChange(roleModal, r)}
                  disabled={roleBusy}
                  className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${
                    roleModal.role === r
                      ? 'border-accent-400 bg-accent-400/10 text-accent-200'
                      : 'border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{ROLE_LABELS[r]}</div>
                    <div className="text-xs text-ink-500">{roleDescription(r)}</div>
                  </div>
                  {roleModal.role === r && <Crown className="ml-auto h-4 w-4 text-amber-300" />}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Assign Set Modal */}
      {assignModal && (
        <Modal onClose={() => setAssignModal(null)} title={`Assign community set — ${assignModal.email}`}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Community Set</label>
              <select
                value={assignSet}
                onChange={(e) => setAssignSet(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
              >
                <option value="">— None —</option>
                {communitySets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssignModal(null)}
                className="rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-300 hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignBusy}
                className="flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/20 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/30 disabled:opacity-50"
              >
                {assignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

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

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-deep"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink-50">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
