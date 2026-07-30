import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Loader2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { syncMyProfile } from '../lib/profile';
import { FORUM_TOPICS } from '../data/forumTopics';
import type { ForumThread } from '../lib/types';

interface Props {
  navigate: (to: string) => void;
}

export default function ForumPage({ navigate }: Props) {
  const { user, configured } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('forum_threads')
        .select('topic_id');
      if (error) setError(error.message);
      else {
        const map: Record<string, number> = {};
        for (const t of (data ?? []) as Pick<ForumThread, 'topic_id'>[]) {
          map[t.topic_id] = (map[t.topic_id] ?? 0) + 1;
        }
        setCounts(map);
      }
      setLoading(false);
    })();
  }, [configured]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <MessageSquare className="h-3 w-3" />
          Community Forum
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Discussion topics</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Threaded discussion by topic. The forum editor fully supports LaTeX — wrap inline math in
          <span className="font-mono text-ink-200"> $...$ </span> and block math in
          <span className="font-mono text-ink-200"> $$...$$</span>.
        </p>
      </header>

      {!configured && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Supabase isn't configured. The forum needs a connected database to load and post
            threads.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {FORUM_TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/forum/${t.slug}`)}
            className="focus-ring group flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-850/50 p-5 text-left transition hover:border-ink-600 hover:bg-ink-850"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm font-semibold"
                  style={{
                    borderColor: `${t.color}40`,
                    backgroundColor: `${t.color}10`,
                    color: t.color,
                  }}
                >
                  {t.name[0]}
                </span>
                <div>
                  <h3 className="font-serif text-lg text-ink-50 group-hover:text-accent-200">{t.name}</h3>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                    {loading ? '…' : `${counts[t.id] ?? 0} threads`}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />
            </div>
            <p className="text-sm text-ink-400">{t.description}</p>
          </button>
        ))}
      </div>

      {!user && configured && (
        <div className="mt-8 flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850/40 p-3 text-xs text-ink-400">
          <Lock className="h-3.5 w-3.5 text-accent-400" />
          Sign in to create threads and post replies.
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center">
        <Loader2 className={`h-4 w-4 animate-spin text-ink-500 ${loading ? '' : 'hidden'}`} />
      </div>
    </div>
  );
}

export function ForumTopicPage({ slug, navigate }: { slug: string; navigate: (to: string) => void }) {
  const { user, configured } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const topic = FORUM_TOPICS.find((t) => t.slug === slug);

  useEffect(() => {
    if (!topic) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('forum_threads')
        .select('id, topic_id, title, author_id, author_name, body, created_at')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setThreads((data as ForumThread[]) ?? []);
      setLoading(false);
    })();
  }, [topic]);

  if (!topic) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-serif text-2xl text-ink-100">Topic not found</h2>
        <button onClick={() => navigate('/forum')} className="mt-4 text-sm text-accent-300 hover:underline">
          Back to forum
        </button>
      </div>
    );
  }

  const createThread = async () => {
    if (!user) {
      setError('Sign in to create a thread.');
      return;
    }
    if (title.trim().length < 3 || body.trim().length < 5) {
      setError('Add a title and a body.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('forum_threads')
      .insert({
        topic_id: topic.id,
        title: title.trim(),
        body: body.trim(),
        author_id: user.id,
        author_name: (user.user_metadata as { display_name?: string })?.display_name || user.email?.split('@')[0] || 'mathlete',
      })
      .select('id, topic_id, title, author_id, author_name, body, created_at')
      .maybeSingle();
    setBusy(false);
    if (error) setError(error.message);
    else if (data) {
      setThreads((t) => [data as ForumThread, ...t]);
      setTitle('');
      setBody('');
      setShowNew(false);
      void syncMyProfile();
      navigate(`/forum/${topic.slug}/thread/${(data as ForumThread).id}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <button
        onClick={() => navigate('/forum')}
        className="focus-ring mb-4 text-xs text-ink-400 hover:text-accent-300"
      >
        ← All topics
      </button>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md border font-mono text-sm font-semibold"
              style={{ borderColor: `${topic.color}40`, backgroundColor: `${topic.color}10`, color: topic.color }}
            >
              {topic.name[0]}
            </span>
            <h1 className="font-serif text-2xl text-ink-50 sm:text-3xl">{topic.name}</h1>
          </div>
          <p className="mt-2 text-sm text-ink-400">{topic.description}</p>
        </div>
        {user && configured && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> New thread
          </button>
        )}
      </header>

      {showNew && (
        <div className="mb-6 space-y-3 rounded-xl border border-ink-700 bg-ink-850/60 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post. Markdown + LaTeX supported: $\\int_0^1 x^2\\,dx = \\frac{1}{3}$."
            rows={6}
            className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100 placeholder:text-ink-500"
          />
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={createThread}
              disabled={busy}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create thread
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="focus-ring rounded-md px-3 py-1.5 text-xs text-ink-400 hover:text-ink-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading threads…
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <p className="text-sm text-ink-400">No threads yet. {user ? 'Start the conversation.' : 'Sign in to start one.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/forum/${topic.slug}/thread/${t.id}`)}
              className="focus-ring group flex w-full items-start justify-between gap-4 rounded-lg border border-ink-700 bg-ink-850/50 p-4 text-left transition hover:border-ink-600 hover:bg-ink-850"
            >
              <div>
                <h3 className="font-serif text-base text-ink-50 group-hover:text-accent-200">{t.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-mono text-accent-300">{t.author_name}</span>
                  <span>·</span>
                  <span>{new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
