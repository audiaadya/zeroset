import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import MathText from './MathText';

interface Comment {
  id: string;
  solution_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface Props {
  solutionId: string;
}

export default function SolutionComments({ solutionId }: Props) {
  const { user, configured } = useAuth();
  const displayName = useDisplayName();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('solution_comments')
      .select('id, solution_id, author_id, author_name, body, created_at')
      .eq('solution_id', solutionId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setComments(data as Comment[]);
    }
    setLoading(false);
  }, [solutionId]);

  useEffect(() => {
    if (showComments && configured) void load();
  }, [showComments, configured, load]);

  const submit = async () => {
    if (!user || !body.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('solution_comments')
      .insert({
        solution_id: solutionId,
        author_id: user.id,
        author_name: displayName,
        body: body.trim(),
      })
      .select('id, solution_id, author_id, author_name, body, created_at')
      .maybeSingle();
    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setBody('');
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    const { error } = await supabase.from('solution_comments').delete().eq('id', id);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="mt-2 border-t border-ink-700 pt-2">
      <button
        onClick={() => setShowComments((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-400 hover:text-accent-300 transition"
      >
        <MessageSquare className="h-3 w-3" />
        {showComments ? 'Hide' : 'Comments'}
        {comments.length > 0 && (
          <span className="font-mono tabular-nums text-ink-500">({comments.length})</span>
        )}
      </button>

      {showComments && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-ink-500">No comments yet. Be the first to leave one.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-md border border-ink-700/60 bg-ink-900/40 p-2">
                <div className="flex items-center justify-between text-[10px] text-ink-400">
                  <span className="flex items-center gap-1 font-mono text-accent-300">
                    <User className="h-2.5 w-2.5" />
                    {c.author_name}
                  </span>
                  <span className="text-ink-500">
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-200">
                  <MathText>{c.body}</MathText>
                </div>
                {user && c.author_id === user.id && (
                  <button
                    onClick={() => remove(c.id)}
                    className="mt-1 flex items-center gap-1 text-[10px] text-ink-500 hover:text-red-300"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </button>
                )}
              </div>
            ))
          )}

          {user ? (
            <div className="flex gap-1.5">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !submitting && body.trim()) void submit(); }}
                placeholder="Leave a comment..."
                className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-100 placeholder:text-ink-500"
              />
              <button
                onClick={submit}
                disabled={submitting || !body.trim()}
                className="focus-ring flex items-center gap-1 rounded-md border border-accent-400/40 bg-accent-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-accent-300 hover:bg-accent-400/20 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-ink-500">Sign in to comment.</p>
          )}
        </div>
      )}
    </div>
  );
}
