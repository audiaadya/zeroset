import { useEffect, useState } from 'react';
import { TrendingUp, Star, ArrowRight, Flame } from 'lucide-react';
import { fetchTrendingCommunitySet, fetchStaffPickCommunitySet } from '../lib/sets';
import type { WeekSet } from '../lib/types';

interface Props {
  navigate: (to: string) => void;
}

// "Trending community set" + "Staff pick" — featured on the homepage.
export default function CommunitySpotlight({ navigate }: Props) {
  const [trending, setTrending] = useState<WeekSet | null>(null);
  const [staffPick, setStaffPick] = useState<WeekSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, s] = await Promise.all([
        fetchTrendingCommunitySet(),
        fetchStaffPickCommunitySet(),
      ]);
      if (!active) return;
      setTrending(t);
      setStaffPick(s);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return null;
  if (!trending && !staffPick) return null;

  return (
    <section className="py-12">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
          <Flame className="h-3 w-3" />
          Community Spotlight
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {trending && (
          <button
            onClick={() => navigate(`/community/${trending.id}`)}
            className="focus-ring group relative overflow-hidden rounded-xl border border-accent-400/40 bg-gradient-to-br from-accent-400/10 to-transparent p-6 text-left transition hover:border-accent-400 hover:shadow-glow"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-400/15 blur-2xl transition-all duration-500 group-hover:bg-accent-400/25" />
            <div className="relative">
              <div className="flex items-center gap-2 text-accent-300">
                <TrendingUp className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Trending now</span>
              </div>
              <h3 className="mt-3 font-serif text-2xl text-ink-50 group-hover:text-accent-200">
                {trending.title}
              </h3>
              {trending.umbrella && (
                <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wider text-accent-300">
                  {trending.umbrella}
                </span>
              )}
              {trending.description && (
                <p className="mt-2 text-sm text-ink-300 line-clamp-2">{trending.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-accent-200">
                <span>Open this set</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </button>
        )}

        {staffPick && (
          <button
            onClick={() => navigate(`/community/${staffPick.id}`)}
            className="focus-ring group relative overflow-hidden rounded-xl border border-accent-400/40 bg-gradient-to-br from-accent-400/10 to-transparent p-6 text-left transition hover:border-accent-400 hover:shadow-glow"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-400/15 blur-2xl transition-all duration-500 group-hover:bg-accent-400/25" />
            <div className="relative">
              <div className="flex items-center gap-2 text-accent-300">
                <Star className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Staff pick</span>
              </div>
              <h3 className="mt-3 font-serif text-2xl text-ink-50 group-hover:text-accent-200">
                {staffPick.title}
              </h3>
              {staffPick.umbrella && (
                <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wider text-accent-300">
                  {staffPick.umbrella}
                </span>
              )}
              {staffPick.description && (
                <p className="mt-2 text-sm text-ink-300 line-clamp-2">{staffPick.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-accent-200">
                <span>Open this set</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
