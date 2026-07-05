import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, CornerDownRight, Send, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { syncMyProfile } from '../lib/profile';
import { getTopicBySlug } from '../data/forumTopics';
import MathText from '../components/MathText';
import type { ForumReply, ForumThread } from '../lib/types';

interface Props {
  topicSlug: string;
  threadId: string;
  navigate: (to: string) => void;
}

interface ReplyNode extends ForumReply {
  children: ReplyNode[];
}

function buildTree(replies: ForumReply[]): ReplyNode[] {
  const byId = new Map<string, ReplyNode>();
  const roots: ReplyNode[] = [];
  for (const r of replies) {
    byId.set(r.id, { ...r, children: [] });
  }
  for (const r of replies) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function ThreadPage({ topicSlug, threadId, navigate }: Props) {
  const { user, configured } = useAuth();
  const topic = getTopicBySlug(topicSlug);
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [tree, setTree] = useState<ReplyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: t, error: te } = await supabase
      .from('forum_threads')
      .select('id, topic_id, title, author_id, author_name, body, created_at')
      .eq('id', threadId)
      .maybeSingle();
    if (te) setError(te.message);
    else setThread(t as ForumThread | null);

    const { data: rs, error: re } = await supabase
      .from('forum_replies')
      .select('id, thread_id, parent_id, author_id, author_name, body, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (re) setError(re.message);
    else {
      const list = (rs as ForumReply[]) ?? [];
      setReplies(list);
      setTree(buildTree(list));
    }
    setLoading(false);
  }, [threadId, configured]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const submit = async (parentId: string | null) => {
    if (!user) {
      setError('Sign in to reply.');
      return;
    }
    const body = parentId === null ? draft : draft;
    if (body.trim().length < 3) {
      setError('Write a bit more.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        thread_id: threadId,
        parent_id: parentId,
        body: body.trim(),
        author_id: user.id,
        author_name: (user.user_metadata as { display_name?: string })?.display_name || user.email?.split('@')[0] || 'mathlete',
      })
      .select('id, thread_id, parent_id, author_id, author_name, body, created_at')
      .maybeSingle();
    setBusy(false);
    if (error) setError(error.message);
    else if (data) {
      setReplies((r) => [...r, data as ForumReply]);
      setTree(buildTree([...replies, data as ForumReply]));
      setDraft('');
      void syncMyProfile();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <button
        onClick={() => navigate(`/forum/${topic.slug}`)}
        className="focus-ring mb-4 text-xs text-ink-400 hover:text-accent-300"
      >
        ← {topic.name}
      </button>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading thread…
        </div>
      ) : !thread ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <p className="text-sm text-ink-400">Thread not found.</p>
        </div>
      ) : (
        <>
          <article className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
            <h1 className="font-serif text-2xl text-ink-50 sm:text-3xl">{thread.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
              <span className="font-mono text-accent-300">{thread.author_name}</span>
              <span>·</span>
              <span>{new Date(thread.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <div className="mt-4">
              <MathText>{thread.body}</MathText>
            </div>
          </article>

          <div className="mt-8">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-300">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </h2>

            {!configured && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Supabase isn't configured.</span>
              </div>
            )}

            {configured && !user && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850/40 p-3 text-xs text-ink-400">
                <Lock className="h-3.5 w-3.5 text-accent-400" />
                Sign in to post a reply.
              </div>
            )}

            {configured && user && (
              <ReplyEditor
                value={draft}
                onChange={setDraft}
                onSubmit={() => submit(null)}
                onCancel={() => setDraft('')}
                busy={busy}
                placeholder="Reply to the thread. Markdown + LaTeX supported."
                submitLabel="Post reply"
              />
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {tree.map((node) => (
                <ReplyNodeView key={node.id} node={node} depth={0} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReplyNodeView({
  node,
  depth,
}: {
  node: ReplyNode;
  depth: number;
}) {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    if (draft.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        thread_id: node.thread_id,
        parent_id: node.id,
        body: draft.trim(),
        author_id: user.id,
        author_name: (user.user_metadata as { display_name?: string })?.display_name || user.email?.split('@')[0] || 'mathlete',
      })
      .select('id, thread_id, parent_id, author_id, author_name, body, created_at')
      .maybeSingle();
    setBusy(false);
    if (error) setError(error.message);
    else if (data) {
      node.children.push({ ...data, children: [] } as ReplyNode);
      setDraft('');
      setShowEditor(false);
      void syncMyProfile();
    }
  };

  return (
    <div
      className="rounded-lg border border-ink-700 bg-ink-850/40 p-4"
      style={{ marginLeft: `${Math.min(depth, 4) * 1.25}rem` }}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-mono text-accent-300">{node.author_name}</span>
        <span className="text-ink-500">
          {new Date(node.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      <MathText>{node.body}</MathText>
      {user && (
        <div className="mt-3">
          <button
            onClick={() => setShowEditor((v) => !v)}
            className="focus-ring flex items-center gap-1.5 text-xs text-ink-400 hover:text-accent-300"
          >
            <CornerDownRight className="h-3.5 w-3.5" /> Reply
          </button>
          {showEditor && (
            <div className="mt-3">
              <ReplyEditor
                value={draft}
                onChange={setDraft}
                onSubmit={submit}
                onCancel={() => setShowEditor(false)}
                busy={busy}
                placeholder="Write a reply. Markdown + LaTeX supported."
                submitLabel="Post reply"
              />
              {error && (
                <div className="mt-2 text-xs text-red-300">{error}</div>
              )}
            </div>
          )}
        </div>
      )}
      {node.children.length > 0 && (
        <div className="mt-4 space-y-3 border-l border-ink-700/60 pl-4">
          {node.children.map((c) => (
            <ReplyNodeView key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  placeholder,
  submitLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  placeholder: string;
  submitLabel: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-ink-700 bg-ink-900/60 p-3">
      <div className="flex items-center gap-2 border-b border-ink-700 pb-2 text-xs text-ink-400">
        <button
          onClick={() => setShowPreview(false)}
          className={`rounded px-2 py-1 ${!showPreview ? 'bg-ink-800 text-ink-100' : 'text-ink-400'}`}
        >
          Write
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`rounded px-2 py-1 ${showPreview ? 'bg-ink-800 text-ink-100' : 'text-ink-400'}`}
        >
          Preview
        </button>
        <span className="ml-auto font-mono text-[10px]">Markdown + LaTeX</span>
      </div>
      {showPreview ? (
        <div className="min-h-[5rem] rounded-md border border-ink-700 bg-ink-900 p-3">
          {value.trim() ? <MathText>{value}</MathText> : <span className="text-sm text-ink-500">Nothing to preview.</span>}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 p-3 font-mono text-sm text-ink-100 placeholder:text-ink-500"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={busy || value.trim().length < 3}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {submitLabel}
        </button>
        <button onClick={onCancel} className="focus-ring rounded-md px-3 py-1.5 text-xs text-ink-400 hover:text-ink-200">
          Cancel
        </button>
      </div>
    </div>
  );
}
