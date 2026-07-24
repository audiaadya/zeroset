import { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Edit3,
  Layers,
  Loader2,
  Lock,
  Mail,
  Plus,
  Save,
  Send,
  Trash2,
  X,
  Tag,
  Users,
  Handshake,
  ImagePlus,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import type { DbProblem, DbWeekSet, Difficulty } from '../lib/types';
import ProblemTags from '../components/ProblemTags';
import MediaAttachments from '../components/MediaAttachments';
import AITagSuggest from '../components/AITagSuggest';
import WeekScreenshots from '../components/WeekScreenshots';
import MathText from '../components/MathText';
import TeamTab from '../components/TeamTab';

interface Props {
  navigate: (to: string) => void;
}

const DIFFICULTIES: Difficulty[] = ['Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad'];

function nextSunday(endOfDay: boolean): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = (7 - day) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, 0, 0);
  return d;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

const PROOF_DELIMITER = '\n\n---\n\n';

function extractProofSection(proof: string, section: 'setup' | 'core' | 'conclusion'): string {
  if (!proof) return '';
  const parts = proof.split(PROOF_DELIMITER);
  if (parts.length >= 3) {
    if (section === 'setup') return parts[0];
    if (section === 'core') return parts[1];
    return parts[2];
  }
  const markers: Record<string, RegExp> = {
    setup: /(Base case|Setup|Initialization|Start|Begin|First)[^]*?(\n\n|$)/i,
    core: /(Inductive step|Main|Core|Key|Argument|Assume|Then|Hence)[^]*?(\n\n|$)/i,
    conclusion: /(Therefore|Thus|Q\.?E\.?D|Conclusion|Done|Complete)[^]*$/i,
  };
  const match = proof.match(markers[section]);
  return match ? match[0].trim() : '';
}

function combineProof(setup: string, core: string, conclusion: string): string {
  return [setup.trim(), core.trim(), conclusion.trim()].filter(Boolean).join(PROOF_DELIMITER);
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  xp: number | null;
  level: number | null;
  solutions_count: number | null;
  created_at: string | null;
}

interface PartnerRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  created_at: string | null;
}

export default function HostDashboardPage({ navigate }: Props) {
  const { user, isHost, configured, loading } = useAuth();
  const displayName = useDisplayName();
  const [sets, setSets] = useState<{ ws: DbWeekSet; problems: DbProblem[] }[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ ws: DbWeekSet; problems: DbProblem[] } | null>(null);
  const [tab, setTab] = useState<'sets' | 'emails' | 'partners' | 'team'>('sets');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const load = async () => {
    setLoadingSets(true);
    const { data, error } = await supabase
      .from('week_sets')
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else {
      const rows = data as DbWeekSet[];
      const out: { ws: DbWeekSet; problems: DbProblem[] }[] = [];
      for (const ws of rows) {
        const { data: probs } = await supabase
          .from('problems')
          .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
          .eq('set_id', ws.id)
          .order('index', { ascending: true });
        out.push({ ws, problems: (probs as DbProblem[]) ?? [] });
      }
      setSets(out);
    }
    setLoadingSets(false);
  };

  const loadEmails = async () => {
    setLoadingEmails(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, xp, level, solutions_count, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setProfiles(data as ProfileRow[]);
    }
    setLoadingEmails(false);
  };

  useEffect(() => {
    if (!configured || !user) {
      setLoadingSets(false);
      return;
    }
    void load();
  }, [configured, user]);

  useEffect(() => {
    if (tab === 'emails' && profiles.length === 0) {
      void loadEmails();
    }
    if (tab === 'partners') {
      void loadPartners();
    }
    if (tab === 'team') {
      // TeamTab loads its own data
    }
  }, [tab]);

  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [showPartnerEdit, setShowPartnerEdit] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRow | null>(null);

  const loadPartners = async () => {
    setLoadingPartners(true);
    const { data } = await supabase
      .from('partners')
      .select('id, name, description, image_url, link_url, sort_order, created_at')
      .order('sort_order', { ascending: true });
    setPartners((data as PartnerRow[]) ?? []);
    setLoadingPartners(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-ink-400 sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <AlertCircle className="mx-auto h-8 w-8 text-yellow-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2>
        <p className="mt-2 text-sm text-ink-400">
          The host dashboard needs a connected database to draft and publish sets.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-accent-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Sign in to continue</h2>
        <p className="mt-2 text-sm text-ink-400">You need to be signed in to reach this page.</p>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-red-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Hosts only</h2>
        <p className="mt-2 text-sm text-ink-400">
          The host dashboard is restricted to the site owner. Anyone can create a Community Set
          though — head to the Community Sets page to start your own weekly bundle.
        </p>
        <button
          onClick={() => navigate('/community')}
          className="mt-5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
        >
          Create a community set
        </button>
      </div>
    );
  }

  const createNew = async () => {
    const publish = nextSunday(true);
    const reveal = new Date(publish.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('week_sets')
      .insert({
        owner_id: user.id,
        owner_name: displayName,
        scope: 'official',
        status: 'draft',
        title: 'Untitled week',
        umbrella: '',
        description: '',
        publish_at: publish.toISOString(),
        reveal_at: reveal.toISOString(),
      })
      .select('id, owner_id, owner_name, scope, status, title, umbrella, description, week_number, publish_at, reveal_at, created_at, updated_at')
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    const ws = data as DbWeekSet;
    const probs = Array.from({ length: 5 }, (_, i) => ({
      set_id: ws.id,
      index: i + 1,
      title: '',
      difficulty: DIFFICULTIES[i] as Difficulty,
      statement: '',
      connection: '',
      answer: '',
      proof: '',
    }));
    const { data: inserted, error: pe } = await supabase
      .from('problems')
      .insert(probs)
      .select('id, set_id, index, title, difficulty, statement, connection, answer, proof, created_at')
      .order('index', { ascending: true });
    if (pe) setError(pe.message);
    else {
      setEditing({ ws, problems: (inserted as DbProblem[]) ?? [] });
      void load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            <Layers className="h-3 w-3" />
            Host dashboard
          </span>
          <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Draft & publish weekly sets</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Draft problems, set the Sunday-night publish time, and the answers auto-lock until the
            next Sunday night. Only your account can publish to the official Current Week.
          </p>
        </div>
        {tab === 'sets' && (
          <button
            onClick={createNew}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> New draft
          </button>
        )}
        {tab === 'partners' && (
          <button
            onClick={() => { setEditingPartner(null); setShowPartnerEdit(true); }}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> Add partner
          </button>
        )}
        {tab === 'team' && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Manage staff roles & permissions</span>
        )}
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-ink-700">
        <button
          onClick={() => setTab('sets')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'sets'
              ? 'border-accent-400 text-accent-200'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Layers className="h-4 w-4" /> Weekly Sets
        </button>
        <button
          onClick={() => setTab('emails')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'emails'
              ? 'border-accent-400 text-accent-200'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Mail className="h-4 w-4" /> User Emails
        </button>
        <button
          onClick={() => setTab('partners')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'partners'
              ? 'border-accent-400 text-accent-200'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Handshake className="h-4 w-4" /> Partners
        </button>
        <button
          onClick={() => setTab('team')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'team'
              ? 'border-accent-400 text-accent-200'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Users className="h-4 w-4" /> Team
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tab === 'sets' && (
        <>
          {loadingSets ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your sets…
            </div>
          ) : sets.length === 0 ? (
            <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
              <p className="text-sm text-ink-400">No drafts yet. Click "New draft" to start this week's bundle.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map(({ ws, problems }) => (
                <SetRow key={ws.id} ws={ws} problemCount={problems.length} onEdit={() => setEditing({ ws, problems })} onChanged={load} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'emails' && (
        <div>
          {loadingEmails ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading user emails…
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-ink-500" />
              <p className="mt-3 text-sm text-ink-400">No registered users yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-ink-700">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-700 bg-ink-850/60">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-400">Display Name</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-400">Email</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-400">Level</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-400">Solutions</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-400">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {profiles.map((p) => (
                    <tr key={p.user_id} className="transition hover:bg-ink-850/40">
                      <td className="px-4 py-3 text-ink-100">{p.display_name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-accent-200">{p.email ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-300">{p.level ?? 0}</td>
                      <td className="px-4 py-3 text-ink-300">{p.solutions_count ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-ink-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-500">
            {profiles.length} registered user{profiles.length !== 1 ? 's' : ''}. Emails are fetched from the profiles table.
          </p>
        </div>
      )}

      {tab === 'team' && <TeamTab />}

      {tab === 'partners' && (
        <div>
          {loadingPartners ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading partners…
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
              <Handshake className="mx-auto h-8 w-8 text-ink-500" />
              <p className="mt-3 text-sm text-ink-400">No partners yet. Click "Add partner" to add one.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850/50 transition hover:border-accent-400/30">
                  {p.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-ink-900">
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-serif text-lg text-ink-50">{p.name}</h3>
                    {p.description && <p className="mt-1 text-sm text-ink-400">{p.description}</p>}
                    {p.link_url && (
                      <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200">
                        <ExternalLink className="h-3 w-3" /> Visit
                      </a>
                    )}
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => { setEditingPartner(p); setShowPartnerEdit(true); }} className="rounded-md border border-ink-700 bg-ink-900/80 p-1.5 text-ink-300 hover:bg-ink-800">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={async () => {
                      if (!confirm('Delete this partner?')) return;
                      await supabase.from('partners').delete().eq('id', p.id);
                      void loadPartners();
                    }} className="rounded-md border border-red-500/40 bg-ink-900/80 p-1.5 text-red-300 hover:bg-red-500/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPartnerEdit && (
        <PartnerEditModal
          partner={editingPartner}
          onClose={() => setShowPartnerEdit(false)}
          onSaved={() => { setShowPartnerEdit(false); void loadPartners(); }}
        />
      )}

      {editing && (
        <SetEditor
          initial={editing.ws}
          initialProblems={editing.problems}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function SetRow({
  ws,
  problemCount,
  onEdit,
  onChanged,
}: {
  ws: DbWeekSet;
  problemCount: number;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const publish = async () => {
    setPublishing(true);
    await supabase.from('week_sets').update({ status: 'published' }).eq('id', ws.id);
    setPublishing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm('Delete this entire set and all its problems? This cannot be undone.')) return;
    setDeleting(true);
    const { data: probs } = await supabase.from('problems').select('id').eq('set_id', ws.id);
    if (probs) {
      for (const p of probs) {
        await supabase.from('problem_tags').delete().eq('problem_id', p.id);
      }
      await supabase.from('problems').delete().eq('set_id', ws.id);
    }
    await supabase.from('week_sets').delete().eq('id', ws.id);
    setDeleting(false);
    onChanged();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-700 bg-ink-850/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-lg text-ink-50">{ws.title || 'Untitled'}</h3>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
              ws.status === 'published'
                ? 'border border-accent-400/40 bg-accent-400/10 text-accent-300'
                : 'border border-ink-600 bg-ink-800 text-ink-400'
            }`}
          >
            {ws.status}
          </span>
          <span className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-400">
            {ws.scope}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-400">
          <span>{problemCount} problems</span>
          {ws.publish_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(ws.publish_at).toLocaleDateString()}
            </span>
          )}
          {ws.reveal_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> reveal {new Date(ws.reveal_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        {ws.status === 'draft' && (
          <button
            onClick={publish}
            disabled={publishing}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish
          </button>
        )}
        <button
          onClick={remove}
          disabled={deleting}
          className="focus-ring rounded-md border border-red-500/30 p-1.5 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
          title="Delete set"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function SetEditor({
  initial,
  initialProblems,
  onClose,
  onSaved,
}: {
  initial: DbWeekSet;
  initialProblems: DbProblem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const setId = initial.id;
  const [title, setTitle] = useState(initial.title);
  const [umbrella, setUmbrella] = useState(initial.umbrella ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [publishAt, setPublishAt] = useState(initial.publish_at ? toLocalInput(new Date(initial.publish_at)) : '');
  const [revealAt, setRevealAt] = useState(initial.reveal_at ? toLocalInput(new Date(initial.reveal_at)) : '');
  const [problems, setProblems] = useState<DbProblem[]>(initialProblems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProblem = (i: number, patch: Partial<DbProblem>) => {
    setProblems((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const save = async (publish: boolean) => {
    setBusy(true);
    setError(null);
    const { error: wsError } = await supabase.from('week_sets').update({
      title: title.trim(),
      umbrella: umbrella.trim(),
      description: description.trim(),
      publish_at: publishAt ? fromLocalInput(publishAt) : null,
      reveal_at: revealAt ? fromLocalInput(revealAt) : null,
      status: publish ? 'published' : 'draft',
    }).eq('id', setId);
    if (wsError) { setError(wsError.message); setBusy(false); return; }
    for (const p of problems) {
      const { error: pe } = await supabase.from('problems').update({
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        connection: p.connection,
        answer: p.answer,
        proof: p.proof,
      }).eq('id', p.id);
      if (pe) { setError(pe.message); setBusy(false); return; }
    }
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl animate-fade-in flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 md:left-auto md:right-6 md:top-24 md:w-72 md:translate-x-0">
          <div className="rounded-xl border border-ink-700 bg-ink-900/95 p-3 shadow-panel backdrop-blur">
            <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-500">
              Save / Publish
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => save(false)}
                disabled={busy}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 hover:border-ink-600 hover:text-ink-100 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button
                onClick={() => save(true)}
                disabled={busy}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="font-serif text-lg text-ink-50">Edit weekly set</h2>
            <p className="mt-0.5 text-xs text-ink-400">
              Drafts are private. Publishing makes the set live at the publish time; answers stay
              locked until the reveal time.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 md:pr-80">
          {/* Metadata */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Umbrella topic</span>
              <input
                value={umbrella}
                onChange={(e) => setUmbrella(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Publish at</span>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Reveal at</span>
              <input
                type="datetime-local"
                value={revealAt}
                onChange={(e) => setRevealAt(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </label>
          </div>

          {/* Week Screenshots */}
          <div className="rounded-lg border border-accent-400/20 bg-accent-400/5 p-4">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-accent-300">
              This Week's Problem Screenshots
            </h3>
            <WeekScreenshots weekId={setId} />
          </div>

          {/* Problems */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-ink-300">Problems (5)</h3>
            {problems.map((p, i) => (
              <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-850/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-400/40 bg-accent-400/10 font-mono text-sm font-semibold text-accent-300">
                    {p.index}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                    Problem {p.index}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title</span>
                      <input
                        value={p.title}
                        onChange={(e) => updateProblem(i, { title: e.target.value })}
                        className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Difficulty</span>
                      <select
                        value={p.difficulty}
                        onChange={(e) => updateProblem(i, { difficulty: e.target.value as Difficulty })}
                        className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Statement</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      <textarea
                        value={p.statement}
                        onChange={(e) => updateProblem(i, { statement: e.target.value })}
                        rows={6}
                        placeholder="The full problem statement. Use $...$ for inline math or $...$ for blocks."
                        className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-graph-paper px-3 py-2 font-mono text-xs text-ink-100"
                      />
                      <div className="min-h-[8rem] rounded-md border border-ink-700 bg-ink-900/60 p-3">
                        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-500">Live Preview</div>
                        {p.statement?.trim() ? (
                          <MathText>{p.statement}</MathText>
                        ) : (
                          <span className="text-xs text-ink-600">Preview will appear here…</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Connection to previous problem</span>
                    <textarea
                      value={p.connection ?? ''}
                      onChange={(e) => updateProblem(i, { connection: e.target.value })}
                      rows={2}
                      placeholder="How does this problem build on the previous one?"
                      className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea
                      value={p.answer ?? ''}
                      onChange={(e) => updateProblem(i, { answer: e.target.value })}
                      rows={2}
                      placeholder="Answer (locked until reveal)"
                      className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
                    />
                  </div>
                  <div className="mt-3 rounded-md border border-accent-400/20 bg-accent-400/5 p-3">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent-300">
                      Proof Walk Sections
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'setup')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(e.target.value, extractProofSection(p.proof ?? '', 'core'), extractProofSection(p.proof ?? '', 'conclusion')) })}
                        rows={4}
                        placeholder="Setup & Base Case — initialize the proof structure"
                        className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100 scrollbar-thin"
                      />
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'core')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(extractProofSection(p.proof ?? '', 'setup'), e.target.value, extractProofSection(p.proof ?? '', 'conclusion')) })}
                        rows={6}
                        placeholder="Core Logic — the main argument / inductive step"
                        className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100 scrollbar-thin"
                      />
                      <textarea
                        value={extractProofSection(p.proof ?? '', 'conclusion')}
                        onChange={(e) => updateProblem(i, { proof: combineProof(extractProofSection(p.proof ?? '', 'setup'), extractProofSection(p.proof ?? '', 'core'), e.target.value) })}
                        rows={4}
                        placeholder="Conclusion — therefore / Q.E.D."
                        className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100 scrollbar-thin"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-ink-500">
                      These sections power the Interactive Proof-Walk. Each becomes a separate step.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-300">
                      <Tag className="h-3 w-3" />
                      Tags
                    </label>
                    <ProblemTags problemId={p.id} editable />
                    <div className="mt-2">
                      <AITagSuggest problemId={p.id} statement={p.statement} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-300">
                      Media (images / videos / links)
                    </label>
                    <MediaAttachments targetType="problem" targetId={p.id} editable />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerEditModal({ partner, onClose, onSaved }: { partner: PartnerRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(partner?.name ?? '');
  const [description, setDescription] = useState(partner?.description ?? '');
  const [imageUrl, setImageUrl] = useState(partner?.image_url ?? '');
  const [linkUrl, setLinkUrl] = useState(partner?.link_url ?? '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const fileName = `partners/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() ?? 'png'}`;
    const { error: upErr } = await supabase.storage.from('week-screenshots').upload(fileName, file, { cacheControl: '3600' });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('week-screenshots').getPublicUrl(fileName);
    setImageUrl(pub.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    if (name.trim().length < 1) { setError('Name is required.'); return; }
    setBusy(true);
    setError(null);
    let success = true;
    if (partner) {
      const { error } = await supabase.from('partners').update({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
      }).eq('id', partner.id);
      if (error) { setError(error.message); success = false; }
    } else {
      const { error } = await supabase.from('partners').insert({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        sort_order: 0,
      });
      if (error) { setError(error.message); success = false; }
    }
    setBusy(false);
    if (success) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg animate-fade-in flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 px-5 py-4">
          <h2 className="font-serif text-lg text-ink-50">{partner ? 'Edit partner' : 'Add partner'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Link URL (optional)</span>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Screenshot / Logo</span>
            {imageUrl ? (
              <div className="group relative overflow-hidden rounded-md border border-ink-700">
                <img src={imageUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                <button onClick={() => setImageUrl('')} className="absolute right-2 top-2 rounded-md border border-red-500/40 bg-ink-900/80 p-1.5 text-red-300 hover:bg-red-500/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-ink-700 bg-ink-850/40 p-6 text-sm text-ink-400 hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Upload image</span>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-ink-700 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:bg-ink-800">Cancel</button>
          <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-1.5 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
