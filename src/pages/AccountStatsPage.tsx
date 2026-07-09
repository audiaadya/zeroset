import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Crown,
  Droplet,
  Flame,
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { fetchLeaderboard, syncMyProfile, type Profile } from '../lib/profile';
import { computeBadges, levelFloorXp, nextLevelXp, progressInLevel } from '../lib/gamify';

interface Props {
  navigate: (to: string) => void;
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplet,
  Hash,
  Target,
  Award,
  Flame,
  Zap,
  MessageSquare,
  TrendingUp,
  Crown,
};

export default function AccountStatsPage({ navigate }: Props) {
  const { user, configured, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!configured || !user) {
      setLoadingStats(false);
      return;
    }
    (async () => {
      const synced = await syncMyProfile();
      setProfile(synced);
      const lb = await fetchLeaderboard(10);
      setLeaderboard(lb);
      setLoadingStats(false);
    })();
  }, [configured, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-yellow-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2>
        <p className="mt-2 text-sm text-ink-400">Stats need a connected database.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-accent-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Sign in to see your stats</h2>
        <p className="mt-2 text-sm text-ink-400">
          Track your XP, level, streak, and badges across every weekly bundle.
        </p>
      </div>
    );
  }

  if (loadingStats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const prog = progressInLevel(xp);
  const stats = {
    solutionsCount: profile?.solutions_count ?? 0,
    correctCount: profile?.correct_count ?? 0,
    postsCount: profile?.posts_count ?? 0,
    streak: profile?.streak ?? 0,
    level,
  };
  const badges = computeBadges(stats);
  const earnedBadges = badges.filter((b) => b.earned);

  const name =
    (user.user_metadata as { display_name?: string })?.display_name ||
    user.email?.split('@')[0] ||
    'mathlete';

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <BarChart3 className="h-3 w-3" />
          Account stats
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">{name}'s profile</h1>
        <p className="mt-2 text-sm text-ink-400">
          XP, level, streak, and badges — earned by submitting solutions, getting them marked
          correct, and posting in the forum.
        </p>
      </header>

      {/* Level + XP bar */}
      <section className="mb-8 rounded-xl border border-ink-700 bg-ink-850/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent-400/60 bg-accent-400/10">
              <span className="font-mono text-2xl font-bold text-accent-300">{level}</span>
              <span className="absolute -bottom-2 rounded-full border border-accent-400/40 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300">
                level
              </span>
            </div>
            <div>
              <div className="font-serif text-2xl text-ink-50">{xp.toLocaleString()} XP</div>
              <div className="text-xs text-ink-400">
                {prog.into} / {prog.span} XP to level {level + 1}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-ink-400">
            <div>
              Level floor: <span className="font-mono text-ink-200">{levelFloorXp(level)} XP</span>
            </div>
            <div>
              Next level: <span className="font-mono text-ink-200">{nextLevelXp(level)} XP</span>
            </div>
          </div>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full border border-ink-700 bg-ink-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all"
            style={{ width: `${prog.pct}%` }}
          />
        </div>
      </section>

      {/* Stat tiles */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Droplet className="h-5 w-5" />}
          label="Solutions submitted"
          value={stats.solutionsCount}
          accent="text-sky-300"
        />
        <StatTile
          icon={<Target className="h-5 w-5" />}
          label="Marked correct"
          value={stats.correctCount}
          accent="text-accent-300"
        />
        <StatTile
          icon={<Flame className="h-5 w-5" />}
          label="Week streak"
          value={stats.streak}
          accent="text-orange-300"
        />
        <StatTile
          icon={<MessageSquare className="h-5 w-5" />}
          label="Forum posts"
          value={stats.postsCount}
          accent="text-violet-300"
        />
      </section>

      {/* Badges */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink-50">Badges</h2>
          <span className="font-mono text-xs text-ink-400">
            {earnedBadges.length} / {badges.length} earned
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => {
            const Icon = BADGE_ICONS[b.icon] ?? Award;
            return (
              <div
                key={b.id}
                className={`flex items-start gap-3 rounded-lg border p-4 transition ${
                  b.earned
                    ? 'border-accent-400/40 bg-accent-400/5'
                    : 'border-ink-700 bg-ink-850/40 opacity-60'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                    b.earned
                      ? 'border-accent-400/40 bg-accent-400/10 text-accent-300'
                      : 'border-ink-700 bg-ink-900 text-ink-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`font-serif text-base ${b.earned ? 'text-ink-50' : 'text-ink-300'}`}>
                    {b.name}
                  </div>
                  <div className="text-xs text-ink-400">{b.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-ink-50">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-6 text-center text-sm text-ink-400">
            No one on the board yet. Be the first.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-850/40">
            {leaderboard.map((p, i) => {
              const isMe = p.user_id === user.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 border-b border-ink-700 px-4 py-3 last:border-b-0 ${
                    isMe ? 'bg-accent-400/5' : ''
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md font-mono text-sm font-semibold ${
                      i === 0
                        ? 'border border-amber-400/40 bg-amber-400/10 text-amber-300'
                        : i === 1
                          ? 'border border-ink-300/30 bg-ink-300/10 text-ink-200'
                          : i === 2
                            ? 'border border-orange-500/30 bg-orange-500/10 text-orange-300'
                            : 'border border-ink-700 bg-ink-900 text-ink-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`truncate text-sm ${isMe ? 'text-accent-200' : 'text-ink-100'}`}>
                      {p.display_name ?? 'mathlete'} {isMe && <span className="text-xs text-accent-400">· you</span>}
                    </div>
                    <div className="text-xs text-ink-500">
                      L{p.level} · {p.correct_count} correct · {p.streak}w streak
                    </div>
                  </div>
                  <div className="font-mono text-sm text-ink-200">{p.xp.toLocaleString()} XP</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 flex items-center justify-center">
        <button
          onClick={() => navigate('/')}
          className="focus-ring rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          Back to current week
        </button>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-ink-700 bg-ink-900 ${accent}`}>
        {icon}
      </div>
      <div className="font-serif text-3xl text-ink-50">{value}</div>
      <div className="mt-1 text-xs text-ink-400">{label}</div>
    </div>
  );
}
