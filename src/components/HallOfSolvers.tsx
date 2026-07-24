import { useEffect, useState } from 'react';
import { Crown, Loader2, ThumbsUp, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import MathText from './MathText';

interface ElegantSolution {
  id: string;
  author_name: string;
  body: string;
  upvotes: number;
  problem_title: string | null;
  is_correct: boolean;
}

export default function HallOfSolvers() {
  const [solutions, setSolutions] = useState<ElegantSolution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('solutions')
        .select(`
          id, author_name, body, upvotes, is_correct,
          problems!inner(title)
        `)
        .eq('is_correct', true)
        .order('upvotes', { ascending: false })
        .limit(6);
      const rows = (data ?? []) as unknown as ElegantSolution[];
      setSolutions(rows.map((r) => ({
        id: r.id,
        author_name: r.author_name,
        body: r.body,
        upvotes: r.upvotes ?? 0,
        problem_title: (r as unknown as { problems: { title: string } | null }).problems?.title ?? null,
        is_correct: r.is_correct,
      })));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Hall of Solvers…
      </div>
    );
  }

  if (solutions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-400" />
        <h2 className="font-serif text-xl text-ink-50">Hall of Solvers</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
          Most elegant proofs
        </span>
      </div>
      <p className="mb-4 text-xs text-ink-400">
        Community-upvoted solutions. Short, clean proofs rise to the top.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {solutions.map((s, i) => (
          <div
            key={s.id}
            className="rounded-lg border border-ink-700 bg-ink-900/60 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {i === 0 && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                <span className="font-mono text-xs text-accent-300">{s.author_name}</span>
                {s.problem_title && (
                  <span className="font-mono text-[10px] text-ink-500">· {s.problem_title}</span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs text-ink-400">
                <ThumbsUp className="h-3 w-3" /> {s.upvotes}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto scrollbar-thin text-sm text-ink-300">
              <MathText>{s.body.slice(0, 500)}{s.body.length > 500 ? '…' : ''}</MathText>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
