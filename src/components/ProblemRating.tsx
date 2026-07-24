import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface Props {
  problemId: string;
}

export default function ProblemRating({ problemId }: Props) {
  const { user, configured } = useAuth();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: ratings } = await supabase
        .from('problem_ratings')
        .select('rating, user_id')
        .eq('problem_id', problemId);

      if (!cancelled && ratings) {
        const ratingsList = ratings as { rating: number; user_id: string }[];
        const sum = ratingsList.reduce((a, b) => a + b.rating, 0);
        setCount(ratingsList.length);
        setAvgRating(ratingsList.length > 0 ? sum / ratingsList.length : null);

        if (user) {
          const mine = ratingsList.find((r) => r.user_id === user.id);
          setMyRating(mine ? mine.rating : null);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [problemId, user, configured]);

  const setRating = async (rating: number) => {
    if (!user || !configured) return;
    setSubmitting(true);
    try {
      if (myRating) {
        const { error } = await supabase
          .from('problem_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('problem_id', problemId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('problem_ratings')
          .insert({ problem_id: problemId, user_id: user.id, rating });
        if (error) throw error;
      }

      setMyRating(rating);

      const { data: ratings } = await supabase
        .from('problem_ratings')
        .select('rating')
        .eq('problem_id', problemId);

      if (ratings) {
        const ratingsList = ratings as { rating: number }[];
        const sum = ratingsList.reduce((a, b) => a + b.rating, 0);
        setCount(ratingsList.length);
        setAvgRating(ratingsList.length > 0 ? sum / ratingsList.length : null);
      }
    } catch (err) {
      console.error('Failed to set rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  const displayRating = hovered ?? myRating ?? Math.round(avgRating ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => user && setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            disabled={!user || !configured || submitting}
            className={`focus-ring rounded-sm p-0.5 transition ${
              !user ? 'cursor-not-allowed opacity-60' : 'hover:scale-110'
            }`}
            title={user ? `Rate ${star} star${star > 1 ? 's' : ''}` : 'Sign in to rate'}
          >
            <Star
              className={`h-4 w-4 transition ${
                star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-ink-600'
              }`}
            />
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-xs text-ink-400">
          {avgRating?.toFixed(1)} ({count} rating{count !== 1 ? 's' : ''})
        </span>
      )}
      {!user && (
        <span className="text-xs text-ink-500">Sign in to rate</span>
      )}
    </div>
  );
}
