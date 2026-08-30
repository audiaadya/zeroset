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
    <div className="mx-auto max-w-5xl px-4 py-12 pt-24 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
            <Users className="h-3.5 w-3.5" />
            Community Sets
          </span>
          <h1 className="mt-4 font-handwritten text-3xl font-bold text-ink-950 sm:text-4xl">Weekly bundles, by the community</h1>
          <p className="mt-2 max-w-2xl font-handwritten text-sm text-ink-700">
            Anyone can run their own recurring weekly problem bundle. Same structure — five
            problems, a steep climb, a one-week answer lock — under your own brand.
          </p>
        </div>
        {user && configured && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold"
          >
            <Plus className="h-4 w-4" /> Create a set
          </button>
        )}
      </header>

      {!configured && (
        <div className="mb-6 flex items-start gap-2 sketch-border-sm bg-amber-50 px-3 py-2 font-handwritten text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Supabase isn't configured. Community sets need a connected database.</span>
        </div>
      )}

      {configured && !user && (
        <div className="mb-6 flex items-center gap-2 sketch-border-sm bg-cream-100 p-3 font-handwritten text-xs text-ink-700">
          <Lock className="h-3.5 w-3.5 text-accent-600" />
          Sign in to create your own community set.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 font-handwritten text-sm text-ink-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading community sets…
        </div>
      ) : sets.length === 0 ? (
        <div className="sketch-border bg-cream-100 p-8 text-center">
          <p className="font-handwritten text-sm text-ink-700">
            No community sets yet. {user ? 'Be the first to publish one.' : 'Sign in to create one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/community/${s.id}`)}
              className="group sketch-border bg-cream-100 p-5 text-left transition hover:border-accent-500 hover:bg-cream-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-handwritten text-xl font-bold text-ink-950 group-hover:text-accent-700">{s.title}</h3>
                  {s.umbrella && (
                    <span className="mt-1 inline-block highlighter font-handwritten text-xs font-bold uppercase tracking-wider text-accent-700">
                      {s.umbrella}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-600" />
              </div>
              {s.description && <p className="mt-2 font-handwritten text-sm text-ink-700 line-clamp-2">{s.description}</p>}
              <div className="mt-3 flex items-center gap-2 font-handwritten text-xs text-ink-600">
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
  const [revealAt, setRevealAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 0, 0);
    setPublishAt(toLocalInput(d));
    const reveal = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    setRevealAt(toLocalInput(reveal));
  }, []);

  const create = async () => {
    if (!user) return;
    if (title.trim().length < 1) {
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
      <div className="relative w-full max-w-lg animate-fade-in border-2 border-ink-700 bg-cream-100 p-5 shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
        <div className="mb-4 flex items-center justify-between border-b border-ink-300 pb-3">
          <h2 className="font-handwritten text-xl font-bold text-ink-950">Create a community set</h2>
          <button onClick={onClose} className="btn-sketch-notebook p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tuesday Night Algebra"
              className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
              style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Umbrella topic</span>
            <input
              value={umbrella}
              onChange={(e) => setUmbrella(e.target.value)}
              placeholder="e.g. Linear Algebra"
              className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
              style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
              style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Publish at</span>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Reveal at</span>
              <input
                type="datetime-local"
                value={revealAt}
                onChange={(e) => setRevealAt(e.target.value)}
                className="w-full border-2 border-ink-400 bg-white px-3 py-2 font-handwritten text-sm text-ink-950 focus:outline-none focus:border-accent-500"
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              />
            </label>
          </div>
          {error && (
            <div className="flex items-start gap-2 sketch-border-sm bg-red-50 px-3 py-2 font-handwritten text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={create}
              disabled={busy}
              className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create draft
            </button>
            <span className="font-handwritten text-xs text-ink-600">
              You'll be taken to the set editor next to add your 5 problems.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
