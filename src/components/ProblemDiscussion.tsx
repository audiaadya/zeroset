import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, Send, ChevronDown, ChevronUp, Trash2, Reply, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import MathText from './MathText';

interface Discussion {
  id: string;
  title: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  reply_count?: number;
}

interface Reply {
  id: string;
  discussion_id: string;
  parent_id: string | null;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  children?: Reply[];
}

interface Props {
  problemId: string;
}

export default function ProblemDiscussion({ problemId }: Props) {
  const { user, configured } = useAuth();
  const displayName = useDisplayName();
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    loadDiscussions();
  }, [problemId, configured]);

  const loadDiscussions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('problem_discussions')
      .select('id, title, body, author_id, author_name, created_at')
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const withCounts = await Promise.all(
        (data as Discussion[]).map(async (d) => {
          const { count } = await supabase
            .from('problem_discussion_replies')
            .select('id', { count: 'exact', head: true })
            .eq('discussion_id', d.id);
          return { ...d, reply_count: count ?? 0 };
        })
      );
      setDiscussions(withCounts);
    }
    setLoading(false);
  };

  const loadReplies = async (discussionId: string) => {
    const { data } = await supabase
      .from('problem_discussion_replies')
      .select('id, discussion_id, parent_id, body, author_id, author_name, created_at')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (data) {
      setReplies(buildReplyTree(data as Reply[]));
    }
  };

  const buildReplyTree = (flat: Reply[]): Reply[] => {
    const byId = new Map<string, Reply>();
    flat.forEach((r) => byId.set(r.id, { ...r, children: [] }));
    const roots: Reply[] = [];
    flat.forEach((r) => {
      const node = byId.get(r.id)!;
      if (r.parent_id && byId.has(r.parent_id)) {
        byId.get(r.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const createDiscussion = async () => {
    if (!user || !newTitle.trim() || !newBody.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('problem_discussions')
      .insert({
        problem_id: problemId,
        title: newTitle.trim(),
        body: newBody.trim(),
        author_id: user.id,
        author_name: displayName,
      })
      .select('id, title, body, author_id, author_name, created_at')
      .maybeSingle();

    if (error) {
      console.error(error);
    } else if (data) {
      setDiscussions([{ ...(data as Discussion), reply_count: 0 }, ...discussions]);
      setNewTitle('');
      setNewBody('');
    }
    setSubmitting(false);
  };

  const createReply = async (discussionId: string, parentId: string | null) => {
    const body = parentId ? replyBodies[parentId] : replyBodies['root'];
    if (!user || !body?.trim()) return;
    setSubmitting(true);
    await supabase.from('problem_discussion_replies').insert({
      discussion_id: discussionId,
      parent_id: parentId,
      body: body.trim(),
      author_id: user.id,
      author_name: displayName,
    });
    await loadReplies(discussionId);
    setReplyBodies((prev) => ({ ...prev, [parentId ?? 'root']: '' }));
    setReplyingTo(null);
    setSubmitting(false);

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId ? { ...d, reply_count: (d.reply_count ?? 0) + 1 } : d
      )
    );
  };

  const deleteDiscussion = async (id: string) => {
    if (!confirm('Delete this discussion?')) return;
    await supabase.from('problem_discussions').delete().eq('id', id);
    setDiscussions(discussions.filter((d) => d.id !== id));
    setActiveDiscussion(null);
  };

  const deleteReply = async (id: string, discussionId: string) => {
    if (!confirm('Delete this reply?')) return;
    await supabase.from('problem_discussion_replies').delete().eq('id', id);
    await loadReplies(discussionId);
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId ? { ...d, reply_count: Math.max(0, (d.reply_count ?? 1) - 1) } : d
      )
    );
  };

  const ReplyItem = ({ reply, depth = 0 }: { reply: Reply; depth?: number }) => (
    <div className={`${depth > 0 ? 'ml-5 border-l-2 border-ink-700 pl-3' : ''} py-2`}>
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span className="flex items-center gap-1.5 font-mono text-accent-300">
          <User className="h-3 w-3" />
          {reply.author_name}
        </span>
        <span>{new Date(reply.created_at).toLocaleDateString()}</span>
      </div>
      <div className="mt-1.5 text-sm">
        <MathText>{reply.body}</MathText>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {user && reply.author_id !== user.id && (
          <button
            onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-accent-300"
          >
            <Reply className="h-3 w-3" /> Reply
          </button>
        )}
        {user && reply.author_id === user.id && (
          <button
            onClick={() => deleteReply(reply.id, activeDiscussion?.id ?? '')}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-red-300"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        )}
      </div>
      {replyingTo === reply.id && (
        <div className="mt-2 space-y-2">
          <textarea
            value={replyBodies[reply.id] ?? ''}
            onChange={(e) => setReplyBodies((prev) => ({ ...prev, [reply.id]: e.target.value }))}
            rows={2}
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
            placeholder="Write a reply..."
          />
          <button
            onClick={() => createReply(activeDiscussion!.id, reply.id)}
            disabled={submitting || !replyBodies[reply.id]?.trim()}
            className="focus-ring flex items-center gap-1 rounded-md border border-accent-400 bg-accent-400/15 px-2 py-1 text-xs text-accent-200 disabled:opacity-50"
          >
            <Send className="h-3 w-3" /> Reply
          </button>
        </div>
      )}
      {reply.children?.map((c) => (
        <ReplyItem key={c.id} reply={c} depth={depth + 1} />
      ))}
    </div>
  );

  if (activeDiscussion) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4">
        <button
          onClick={() => setActiveDiscussion(null)}
          className="flex items-center gap-1 text-xs text-ink-400 hover:text-accent-200"
        >
          {'<'} Back to discussions
        </button>

        <div className="mt-4 border-b border-ink-700 pb-4">
          <h4 className="font-serif text-lg text-ink-50">{activeDiscussion.title}</h4>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
            <span className="font-mono text-accent-300">{activeDiscussion.author_name}</span>
            <span>{new Date(activeDiscussion.created_at).toLocaleDateString()}</span>
          </div>
          <div className="mt-2 text-sm text-ink-300">
            <MathText>{activeDiscussion.body}</MathText>
          </div>
          {user && activeDiscussion.author_id === user.id && (
            <button
              onClick={() => deleteDiscussion(activeDiscussion.id)}
              className="mt-2 flex items-center gap-1 text-xs text-ink-500 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" /> Delete discussion
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <MessageSquare className="h-3.5 w-3.5" />
            {replies.length} replies
          </div>

          {replies.map((r) => (
            <ReplyItem key={r.id} reply={r} />
          ))}

          {user && (
            <div className="mt-4 space-y-2 rounded-md border border-ink-700 bg-ink-900/50 p-3">
              <textarea
                value={replyBodies['root'] ?? ''}
                onChange={(e) => setReplyBodies((prev) => ({ ...prev, root: e.target.value }))}
                rows={3}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100 resize-y"
                placeholder="Write a reply..."
              />
              <button
                onClick={() => createReply(activeDiscussion.id, null)}
                disabled={submitting || !(replyBodies['root']?.trim())}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs text-accent-200 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Post Reply
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="focus-ring flex w-full items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900/40 px-3 py-2.5 text-left text-sm text-ink-200 transition hover:border-accent-400/40 hover:text-accent-200"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent-400" />
          {expanded ? 'Hide discussion' : 'Problem Discussion'}
          {discussions.length > 0 && (
            <span className="rounded-full border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
              {discussions.length}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-4">
          {user && (
            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                placeholder="Discussion title..."
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 resize-y"
                placeholder="Start a discussion about this problem..."
              />
              <button
                onClick={createDiscussion}
                disabled={submitting || !newTitle.trim() || !newBody.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Start Discussion
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : discussions.length === 0 ? (
            <div className="text-sm text-ink-400 text-center py-4">
              No discussions yet. Be the first to start one!
            </div>
          ) : (
            <div className="space-y-3">
              {discussions.map((d) => (
                <button
                  key={d.id}
                  onClick={async () => {
                    setActiveDiscussion(d);
                    await loadReplies(d.id);
                  }}
                  className="w-full rounded-md border border-ink-700 bg-ink-900/50 p-3 text-left hover:border-ink-600 transition text-sm"
                >
                  <div className="font-medium text-ink-100">{d.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                    <span className="font-mono text-accent-300">{d.author_name}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {d.reply_count ?? 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
