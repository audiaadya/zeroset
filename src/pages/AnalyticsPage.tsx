import { useEffect, useState } from 'react';
import {
  Activity, BarChart3, CheckCircle2, Eye, Flame, Loader2, Lock, TrendingUp,
  Users, Zap, Bug, Target, Puzzle, ArrowLeft, Swords, MessageSquare, Globe,
  ChevronDown, ChevronUp, Crown, Calendar, Mail, Clock, Award,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { XP_CORRECT, XP_REPLY, XP_SOLUTION, XP_THREAD, progressInLevel } from '../lib/gamify';
import { fetchAnalyticsSummary, type AnalyticsSummary, type AuthUser } from '../lib/analytics';
import { supabase } from '../lib/supabaseClient';

interface Props { navigate: (to: string) => void; }
type UserPanelTab = 'summary' | 'xp';

function formatJoinedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnalyticsPage({ navigate }: Props) {
  const { user, isHost, configured, loading } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'engagement' | 'games' | 'referrals'>('overview');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userTabs, setUserTabs] = useState<Record<string, UserPanelTab>>({});

  useEffect(() => {
    if (!configured || !isHost) { setLoadingData(false); return; }
    (async () => {
      const s = await fetchAnalyticsSummary();
      setData(s);
      setLoadingData(false);
    })();
  }, [configured, isHost]);

  useEffect(() => {
    if (!isHost || !user) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/host-analytics`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setAuthUsers(json.users || []);
          if (data) {
            setData({
              ...data,
              totalAuthUsers: json.totalAuthUsers ?? 0,
              verifiedUsers: json.verifiedUsers ?? 0,
              unverifiedUsers: json.unverifiedUsers ?? 0,
              authUsers: json.users ?? [],
            });
          }
        }
      } catch { /* ignore */ }
    })();
  }, [isHost, user]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" /></div>;
  if (!configured) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><Lock className="mx-auto h-8 w-8 text-yellow-400" /><h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2></div>;
  if (!user) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><Lock className="mx-auto h-8 w-8 text-accent-400" /><h2 className="mt-4 font-serif text-2xl text-ink-100">Sign in to view analytics</h2></div>;
  if (!isHost) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><Lock className="mx-auto h-8 w-8 text-red-400" /><h2 className="mt-4 font-serif text-2xl text-ink-100">Hosts only</h2><button onClick={() => navigate('/current-week')} className="mt-5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25">Back to current week</button></div>;
  if (loadingData) return <div className="mx-auto max-w-6xl px-4 py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" /></div>;
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-20 text-center"><BarChart3 className="mx-auto h-8 w-8 text-ink-400" /><h2 className="mt-4 font-serif text-2xl text-ink-100">No analytics data yet</h2></div>;

  const maxDaily = Math.max(1, ...data.dailyVisits.map((d) => d.count));
  const totalUsersCount = Math.max(data.totalUsers, authUsers.length, data.totalAuthUsers);
  const users = data.users.map((profile) => ({
    profile,
    auth: authUsers.find((u) => u.id === profile.user_id),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/host')} className="mb-6 flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200"><ArrowLeft className="h-4 w-4" /> Back to host dashboard</button>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-accent-400" />
          <div>
            <h1 className="font-serif text-3xl text-ink-50">Analytics Dashboard</h1>
            <p className="text-sm text-ink-400">Complete overview of your site's traffic, users, and game activity.</p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {(['overview', 'users', 'engagement', 'games', 'referrals'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-accent-400/20 text-accent-200' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}>
            {tab === 'engagement' ? 'Engagement' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile icon={<Users className="h-5 w-5" />} label="Active Users (7d)" value={data.weeklyActiveSolvers} accent="text-accent-300" />
            <StatTile icon={<Eye className="h-5 w-5" />} label="Total Visits" value={data.totalVisits} accent="text-sky-300" />
            <StatTile icon={<TrendingUp className="h-5 w-5" />} label="Visits (7d)" value={data.visits7d} accent="text-emerald-300" />
            <StatTile icon={<Flame className="h-5 w-5" />} label="Visits (30d)" value={data.visits30d} accent="text-orange-300" />
            <StatTile icon={<Calendar className="h-5 w-5" />} label="Total Users" value={totalUsersCount} accent="text-violet-300" />
          </section>

          {/* Auth Funnel */}
          <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
            <h2 className="mb-4 font-serif text-xl text-ink-50">Signup & Auth Funnel</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
                <div className="text-xs text-ink-400">Total Registered (Auth)</div>
                <div className="mt-1 font-serif text-2xl text-ink-50">{data.totalAuthUsers || authUsers.length}</div>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
                <div className="text-xs text-ink-400">Verified Emails</div>
                <div className="mt-1 font-serif text-2xl text-accent-300">{data.verifiedUsers || authUsers.filter(u => u.email_confirmed_at).length}</div>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
                <div className="text-xs text-ink-400">Unverified Emails</div>
                <div className="mt-1 font-serif text-2xl text-amber-300">{data.unverifiedUsers || authUsers.filter(u => !u.email_confirmed_at).length}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
                <div className="text-xs text-ink-400">Weekly Active Solvers</div>
                <div className="mt-1 font-serif text-2xl text-ink-50">{data.weeklyActiveSolvers}</div>
                <div className="text-[10px] text-ink-500">Users who submitted in the last 7 days</div>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
                <div className="text-xs text-ink-400">Week-over-Week Retention</div>
                <div className="mt-1 font-serif text-2xl text-ink-50">{data.retentionRate}%</div>
                <div className="text-[10px] text-ink-500">Users active this week / total users</div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<BarChart3 className="h-5 w-5" />} label="Solutions" value={data.totalSolutions} accent="text-violet-300" />
            <StatTile icon={<CheckCircle2 className="h-5 w-5" />} label="Correct" value={data.correctSolutions} accent="text-accent-300" />
            <StatTile icon={<Zap className="h-5 w-5" />} label="Sudden Death" value={data.suddenDeathAttempts} accent="text-amber-300" />
            <StatTile icon={<Swords className="h-5 w-5" />} label="Duels" value={data.duelsOpen + data.duelsCompleted} accent="text-red-300" />
          </section>

          <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
            <h2 className="mb-4 font-serif text-xl text-ink-50">Visits — last 14 days</h2>
            {data.dailyVisits.every((d) => d.count === 0) ? (
              <p className="text-sm text-ink-400">No visits recorded yet.</p>
            ) : (
              <div className="flex h-40 items-end gap-1.5">
                {data.dailyVisits.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-gradient-to-t from-accent-500/40 to-accent-400 transition-all" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }} title={`${d.day}: ${d.count} visits`} />
                    <span className="font-mono text-[9px] text-ink-500">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
            <h2 className="mb-4 font-serif text-xl text-ink-50">Top Pages</h2>
            {data.topPaths.length === 0 ? <p className="text-sm text-ink-400">No page data yet.</p> : (
              <div className="space-y-2">
                {data.topPaths.map((p) => {
                  const max = data.topPaths[0].count || 1;
                  return (
                    <div key={p.path} className="flex items-center gap-3">
                      <span className="w-32 truncate font-mono text-xs text-ink-300">{p.path}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900"><div className="h-full bg-accent-400/60" style={{ width: `${(p.count / max) * 100}%` }} /></div>
                      <span className="w-12 text-right font-mono text-xs text-ink-400">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Users className="h-5 w-5" />} label="Total Users" value={totalUsersCount} accent="text-sky-300" />
            <StatTile icon={<TrendingUp className="h-5 w-5" />} label="New (7d)" value={data.newUsers7d} accent="text-emerald-300" />
            <StatTile icon={<Flame className="h-5 w-5" />} label="New (30d)" value={data.newUsers30d} accent="text-orange-300" />
            <StatTile icon={<Mail className="h-5 w-5" />} label="Emails Collected" value={authUsers.length} accent="text-violet-300" />
          </section>

          <section className="rounded-xl border border-ink-700 bg-ink-850/50">
            <div className="border-b border-ink-700 p-4">
              <h2 className="font-serif text-xl text-ink-50">All Users ({users.length})</h2>
              <p className="text-xs text-ink-400">Click to expand and see user activity</p>
            </div>
            {users.length === 0 ? <div className="p-8 text-center text-sm text-ink-400">No users yet.</div> : (
              <div className="divide-y divide-ink-700">
                {users.map(({ profile, auth }) => {
                  const stats = data.gameStats.find((g) => g.user_id === profile.user_id);
                  const userStats = stats ?? { user_id: profile.user_id, display_name: profile.display_name, solutions: 0, correct_solutions: 0, sudden_death_attempts: 0, sudden_death_correct: 0, bounties_posted: 0, bounties_solved: 0, reverse_eng_prompts: 0, duels_participated: 0, duels_won: 0, forum_threads: 0, forum_replies: 0 };
                  const isOpen = expandedUser === profile.user_id;
                  const activeUserTab = userTabs[profile.user_id] ?? 'summary';
                  const joinedAt = auth?.created_at ?? profile.joined_at;
                  const displayName = auth?.user_metadata?.display_name || profile.display_name || auth?.email?.split('@')[0] || profile.email || 'Anonymous';
                  const email = auth?.email || profile.email || 'Unknown';
                  const xpBreakdown = [
                    { label: 'Solutions submitted', points: profile.solutions_count * XP_SOLUTION },
                    { label: 'Correct solutions', points: profile.correct_count * XP_CORRECT },
                    { label: 'Forum threads', points: userStats.forum_threads * XP_THREAD },
                    { label: 'Forum replies', points: userStats.forum_replies * XP_REPLY },
                  ];
                  const trackedXp = xpBreakdown.reduce((sum, row) => sum + row.points, 0);
                  const progress = progressInLevel(profile.xp);
                  return (
                    <div key={profile.user_id}>
                      <button onClick={() => setExpandedUser(isOpen ? null : profile.user_id)} className="flex w-full items-center justify-between p-4 text-left hover:bg-ink-800/50">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-400/20 font-mono text-sm font-semibold text-accent-300">{displayName[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <div className="font-medium text-ink-100">{displayName}</div>
                            <div className="font-mono text-xs text-ink-400">{email}</div>
                            <div className="mt-1 text-xs text-ink-500">Joined {formatJoinedDate(joinedAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right"><div className="text-xs text-ink-400">XP</div><div className="font-mono text-xs text-ink-300">{profile.xp.toLocaleString()}</div></div>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="bg-ink-900/50 p-4">
                          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                            {(['summary', 'xp'] as const).map((tab) => (
                              <button key={tab} onClick={() => setUserTabs((prev) => ({ ...prev, [profile.user_id]: tab }))} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${activeUserTab === tab ? 'bg-accent-400/20 text-accent-200' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}>
                                {tab === 'summary' ? 'Summary' : 'XP Breakdown'}
                              </button>
                            ))}
                          </div>
                          {activeUserTab === 'summary' ? (
                            <div className="grid gap-4 text-sm sm:grid-cols-4">
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-3"><div className="text-xs text-ink-400">Solutions</div><div className="font-mono text-lg text-ink-100">{userStats.solutions}</div><div className="text-xs text-accent-300">{userStats.correct_solutions} correct</div></div>
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-3"><div className="text-xs text-ink-400">Sudden Death</div><div className="font-mono text-lg text-ink-100">{userStats.sudden_death_attempts}</div><div className="text-xs text-amber-300">{userStats.sudden_death_correct} correct</div></div>
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-3"><div className="text-xs text-ink-400">Bounties</div><div className="font-mono text-lg text-ink-100">{userStats.bounties_posted}</div><div className="text-xs text-red-300">{userStats.bounties_solved} solved</div></div>
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-3"><div className="text-xs text-ink-400">Forum</div><div className="font-mono text-lg text-ink-100">{userStats.forum_threads + userStats.forum_replies}</div><div className="text-xs text-sky-300">{userStats.forum_threads} threads</div></div>
                            </div>
                          ) : (
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
                                <div className="text-xs uppercase tracking-[0.2em] text-ink-500">Stored XP</div>
                                <div className="mt-2 font-serif text-3xl text-ink-50">{profile.xp.toLocaleString()} XP</div>
                                <div className="mt-1 text-xs text-ink-400">Level {progress.level} with {progress.into} / {progress.span} XP to the next level</div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-900"><div className="h-full bg-gradient-to-r from-accent-500 to-emerald-400" style={{ width: `${progress.pct}%` }} /></div>
                              </div>
                              <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
                                <div className="text-xs uppercase tracking-[0.2em] text-ink-500">Tracked sources</div>
                                <div className="mt-3 space-y-3">
                                  {xpBreakdown.map((item) => (
                                    <div key={item.label}>
                                      <div className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-200">{item.label}</span><span className="font-mono text-ink-100">{item.points.toLocaleString()} XP</span></div>
                                      <div className="mt-1 h-2 rounded-full bg-ink-900"><div className="h-full rounded-full bg-accent-400/60" style={{ width: `${trackedXp > 0 ? Math.max(6, Math.round((item.points / trackedXp) * 100)) : 0}%` }} /></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
            <h2 className="mb-4 font-serif text-xl text-ink-50">Problem-Level Engagement</h2>
            <p className="mb-4 text-xs text-ink-400">Submission rate and accuracy per problem. Spot where the difficulty curve drops off.</p>
            {data.problemEngagement.length === 0 ? <p className="text-sm text-ink-400">No solution data yet.</p> : (
              <div className="space-y-3">
                {data.problemEngagement.map((p) => (
                  <div key={p.problemIndex} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-400/40 bg-accent-400/10 font-mono text-sm text-accent-300">{p.problemIndex}</span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-ink-300">{p.submissions} submissions</span>
                        <span className="text-ink-400">{p.correct} correct · {p.accuracy}% accuracy</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-ink-900">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400/60 to-accent-400/60" style={{ width: `${Math.max(4, (p.submissions / Math.max(...data.problemEngagement.map(e => e.submissions))) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
            <h2 className="mb-4 font-serif text-xl text-ink-50">Streak Distribution</h2>
            <p className="mb-4 text-xs text-ink-400">How many users maintain consecutive-week solving streaks.</p>
            {data.streakDistribution.length === 0 ? <p className="text-sm text-ink-400">No streak data yet.</p> : (
              <div className="space-y-2">
                {data.streakDistribution.map((s) => {
                  const max = data.streakDistribution[0]?.count || 1;
                  return (
                    <div key={s.streak} className="flex items-center gap-4">
                      <span className="w-24 text-sm text-ink-200">{s.streak}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-900"><div className="h-full rounded-full bg-amber-400/60" style={{ width: `${(s.count / max) * 100}%` }} /></div>
                      <span className="w-8 text-right font-mono text-xs text-ink-400">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
              <div className="flex items-center gap-2 text-xs text-ink-400"><Clock className="h-4 w-4 text-accent-400" /> Weekly Active Solvers</div>
              <div className="mt-2 font-serif text-3xl text-ink-50">{data.weeklyActiveSolvers}</div>
              <div className="text-[10px] text-ink-500">Unique users who submitted in the last 7 days</div>
            </div>
            <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
              <div className="flex items-center gap-2 text-xs text-ink-400"><TrendingUp className="h-4 w-4 text-accent-400" /> Retention Rate</div>
              <div className="mt-2 font-serif text-3xl text-ink-50">{data.retentionRate}%</div>
              <div className="text-[10px] text-ink-500">Week-over-week user retention</div>
            </div>
          </section>
        </div>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Zap className="h-5 w-5" />} label="Sudden Death" value={data.suddenDeathAttempts} accent="text-amber-300" sublabel={`${data.suddenDeathCorrect} correct`} />
            <StatTile icon={<Bug className="h-5 w-5" />} label="Bounties Open" value={data.bountyOpen} accent="text-red-300" sublabel={`${data.bountySolved} solved`} />
            <StatTile icon={<Swords className="h-5 w-5" />} label="Duels Open" value={data.duelsOpen} accent="text-violet-300" sublabel={`${data.duelsCompleted} completed`} />
            <StatTile icon={<Puzzle className="h-5 w-5" />} label="Reverse Eng" value={data.reverseEngPrompts} accent="text-emerald-300" />
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <StatTile icon={<MessageSquare className="h-5 w-5" />} label="Forum Threads" value={data.forumThreads} accent="text-sky-300" />
            <StatTile icon={<MessageSquare className="h-5 w-5" />} label="Forum Replies" value={data.forumReplies} accent="text-sky-400" />
          </section>
          <section className="rounded-xl border border-ink-700 bg-ink-850/50">
            <div className="border-b border-ink-700 p-4"><h2 className="font-serif text-xl text-ink-50">Activity Leaderboard</h2><p className="text-xs text-ink-400">Ranked by total solutions submitted</p></div>
            <div className="divide-y divide-ink-700">
              {data.gameStats.slice(0, 20).map((g, idx) => (
                <div key={g.user_id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold ${idx === 0 ? 'bg-amber-400/20 text-amber-300' : idx === 1 ? 'bg-gray-400/20 text-gray-300' : idx === 2 ? 'bg-orange-400/20 text-orange-300' : 'bg-ink-700 text-ink-400'}`}>{idx === 0 ? <Crown className="h-4 w-4" /> : idx + 1}</div>
                    <div className="font-medium text-ink-100">{g.display_name || 'Anonymous'}</div>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="text-center"><div className="text-ink-100">{g.solutions}</div><div className="text-ink-500">sols</div></div>
                    <div className="text-center"><div className="text-accent-300">{g.correct_solutions}</div><div className="text-ink-500">correct</div></div>
                    <div className="text-center"><div className="text-amber-300">{g.sudden_death_attempts}</div><div className="text-ink-500">SD</div></div>
                    <div className="text-center"><div className="text-red-300">{g.duels_won}</div><div className="text-ink-500">duels</div></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-ink-700 bg-ink-850/50">
            <div className="border-b border-ink-700 p-4"><h2 className="font-serif text-xl text-ink-50">How People Found Us</h2><p className="text-xs text-ink-400">Source tracking from signup</p></div>
            {data.referrals.length === 0 ? <div className="p-8 text-center text-sm text-ink-400">No referral data yet.</div> : (
              <div className="divide-y divide-ink-700">
                {data.referrals.map((r) => {
                  const max = data.referrals[0]?.user_count || 1;
                  return (
                    <div key={r.source} className="flex items-center gap-4 p-4">
                      <Globe className="h-5 w-5 text-accent-400" />
                      <div className="flex-1">
                        <div className="mb-1 text-sm text-ink-200">{r.source}</div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-900"><div className="h-full bg-accent-400/60" style={{ width: `${(r.user_count / max) * 100}%` }} /></div>
                      </div>
                      <div className="font-mono text-sm text-ink-100">{r.user_count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, accent, sublabel }: { icon: React.ReactNode; label: string; value: number; accent: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-5">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-ink-700 bg-ink-900 ${accent}`}>{icon}</div>
      <div className="font-serif text-3xl text-ink-50">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-ink-400">{label}</div>
      {sublabel && <div className="mt-0.5 text-[10px] text-ink-500">{sublabel}</div>}
    </div>
  );
}
