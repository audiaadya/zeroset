import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, Users, Lock, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import { fetchCommunitySets } from '../lib/sets';
import type { WeekSet } from '../lib/types';

interface Props {
  navigate: (to: string) => void;
}

export default function CommunitySetsPage({ navigate }: Props) {
  const { user, configured } = useAuth();
  const [sets, setSets] = useState<WeekSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchCommunitySets();
    setSets(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    void load();
  }, [configured]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
            <Users className="h-3 w-3" />
            Community Sets
          </span>
          <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Weekly bundles, by the community</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Anyone can run their own recurring weekly problem bundle. Same structure — five
            problems, a steep climb, a one-week answer lock — under your own brand.
          </p>
        </div>
        {user && configured && (
          <button
            onClick={() => setShowCreate(true)}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> Create a set
          </button>
        )}
      </header>

      {!configured && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Supabase isn't configured. Community sets need a connected database.</span>
        </div>
      )}

      {configured && !user && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850/40 p-3 text-xs text-ink-400">
          <Lock className="h-3.5 w-3.5 text-accent-400" />
          Sign in to create your own community set.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading community sets…
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <p className="text-sm text-ink-400">
            No community sets yet. {user ? 'Be the first to publish one.' : 'Sign in to create one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/community/${s.id}`)}
              className="focus-ring group flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-850/50 p-5 text-left transition hover:border-ink-600 hover:bg-ink-850"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg text-ink-50 group-hover:text-accent-200">{s.title}</h3>
                  {s.umbrella && (
                    <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wider text-accent-300">
                      {s.umbrella}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />
              </div>
              {s.description && <p className="text-sm text-ink-400 line-clamp-2">{s.description}</p>}
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                <span>{s.problems.length} problems</span>
                <span>·</span>
                <span>
                  reveals {new Date(s.revealDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && user && (
        <CreateSetModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            navigate(`/community/${id}`);
          }}
        />
      )}
    </div>
  );
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function CreateSetModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const displayName = useDisplayName();
  const [title, setTitle] = useState('');
  const [umbrella, setUmbrella] = useState('');
  const [description, setDescription] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Default: next Sunday 23:59, reveal the Sunday after.
    const d = new Date();
    const day = d.getDay();
    const daysUntilSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 0, 0);
    setPublishAt(toLocalInput(d));
    const reveal = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    setRevealDefault(toLocalInput(reveal));
  }, []);
  const [revealAt, setRevealDefault] = useState('');

  const create = async () => {
    if (!user) return;
    if (title.trim().length < 3) {
      setError('Add a title.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('week_sets')
      .insert({
        owner_id: user.id,
        owner_name: displayName,
        scope: 'community',
        status: 'draft',
        title: title.trim(),
        umbrella: umbrella.trim(),
        description: description.trim(),
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        reveal_at: revealAt ? new Date(revealAt).toISOString() : null,
      })
      .select('id')
      .maybeSingle();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    const id = (data as { id: string }).id;
    // Seed 5 empty problems
    const probs = Array.from({ length: 5 }, (_, i) => ({
      set_id: id,
      index: i + 1,
      title: '',
      difficulty: ['Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad'][i],
      statement: '',
      connection: '',
      answer: '',
      proof: '',
    }));
    const { error: pe } = await supabase.from('problems').insert(probs);
    setBusy(false);
    if (pe) setError(pe.message);
    else onCreated(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg animate-fade-in rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink-50">Create a community set</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tuesday Night Algebra"
              className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Umbrella topic</span>
            <input
              value={umbrella}
              onChange={(e) => setUmbrella(e.target.value)}
              placeholder="e.g. Linear Algebra"
              className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
            />
          </label>
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
                onChange={(e) => setRevealDefault(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100"
              />
            </label>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={create}
              disabled={busy}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create draft
            </button>
            <span className="text-xs text-ink-500">
              You'll be taken to the set editor next to add your 5 problems.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
