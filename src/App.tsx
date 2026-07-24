import { AuthProvider } from './lib/AuthContext';
import { matchRoute, useRouter } from './lib/router';
import Nav from './components/Nav';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import CurrentWeekPage from './pages/CurrentWeekPage';
import ArchivePage from './pages/ArchivePage';
import ForumPage, { ForumTopicPage } from './pages/ForumPage';
import ThreadPage from './pages/ThreadPage';
import LandingPage from './pages/LandingPage';
import HostDashboardPage from './pages/HostDashboardPage';
import CommunitySetsPage from './pages/CommunitySetsPage';
import CommunitySetPage from './pages/CommunitySetPage';
import AccountStatsPage from './pages/AccountStatsPage';
import SettingsPage from './pages/SettingsPage';
import SkillTreePage from './pages/SkillTreePage';
import AnalyticsPage from './pages/AnalyticsPage';
import BountyBoardPage from './pages/BountyBoardPage';
import ReverseEngPage from './pages/ReverseEngPage';
import SuddenDeathPage from './pages/SuddenDeathPage';
import PartnersPage from './pages/PartnersPage';
import AboutPage from './pages/AboutPage';
import TeamManagementPage from './pages/TeamManagementPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import EmailPromptModal from './components/EmailPromptModal';
import { useAuth } from './lib/AuthContext';
import { can, type Permission } from './lib/permissions';

function Routes() {
  const { route, navigate } = useRouter();
  const { teamRole, loading, isHost } = useAuth();
  const path = route.path;

  // Permission guard: if the route requires a permission the user lacks,
  // show the 403 page. Wait for auth to load before deciding.
  const requirePerm = (perm: Permission, element: React.ReactNode): React.ReactNode => {
    if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" /></div>;
    if (!can(teamRole, perm)) return <AccessDeniedPage navigate={navigate} />;
    return element;
  };

  if (path === '/' || path === '' || path === '/home') {
    return <LandingPage navigate={navigate} />;
  }
  if (path === '/current-week') {
    return <CurrentWeekPage navigate={navigate} />;
  }
  if (path === '/archive') {
    return <ArchivePage navigate={navigate} />;
  }
  const archiveMatch = matchRoute(path, '/archive/:weekId');
  if (archiveMatch) {
    return <ArchivePage navigate={navigate} weekId={archiveMatch.weekId} />;
  }
  if (path === '/forum') {
    return <ForumPage navigate={navigate} />;
  }
  if (path === '/host') {
    // Allow access for admins (weekly.edit) OR the legacy host email check.
    if (loading) {
      return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" /></div>;
    }
    if (can(teamRole, 'weekly.edit') || isHost) {
      return <HostDashboardPage navigate={navigate} />;
    }
    return <AccessDeniedPage navigate={navigate} />;
  }
  if (path === '/host/analytics') {
    return requirePerm('analytics.view', <AnalyticsPage navigate={navigate} />);
  }
  if (path === '/team') {
    return requirePerm('team.manage', <TeamManagementPage navigate={navigate} />);
  }
  if (path === '/community') {
    return <CommunitySetsPage navigate={navigate} />;
  }
  if (path === '/me') {
    return <AccountStatsPage navigate={navigate} />;
  }
  if (path === '/me/settings') {
    return <SettingsPage navigate={navigate} />;
  }
  if (path === '/skill-tree') {
    return <SkillTreePage />;
  }
  if (path === '/bounty') {
    return <BountyBoardPage navigate={navigate} />;
  }
  if (path === '/reverse-eng') {
    return <ReverseEngPage navigate={navigate} />;
  }
  if (path === '/sudden-death') {
    return <SuddenDeathPage navigate={navigate} />;
  }
  if (path === '/partners') {
    return <PartnersPage navigate={navigate} />;
  }
  if (path === '/about') {
    return <AboutPage navigate={navigate} />;
  }

  const communitySetMatch = matchRoute(path, '/community/:setId');
  if (communitySetMatch) {
    return <CommunitySetPage setId={communitySetMatch.setId} navigate={navigate} />;
  }

  const topicMatch = matchRoute(path, '/forum/:slug');
  if (topicMatch) {
    return <ForumTopicPage slug={topicMatch.slug} navigate={navigate} />;
  }

  const threadMatch = matchRoute(path, '/forum/:slug/thread/:threadId');
  if (threadMatch) {
    return (
      <ThreadPage
        topicSlug={threadMatch.slug}
        threadId={threadMatch.threadId}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <h2 className="font-serif text-3xl text-ink-50">404</h2>
      <p className="mt-2 text-sm text-ink-400">This page doesn't exist.</p>
      <button
        onClick={() => navigate('/current-week')}
        className="mt-4 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
      >
        Back to current week
      </button>
    </div>
  );
}

export default function App() {
  const { route, navigate } = useRouter();
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-graph-paper text-ink-100">
        <Nav current={route.path} navigate={navigate} />
        <main className="flex-1">
          <PageTransition routeKey={route.path}>
            <Routes />
          </PageTransition>
        </main>
        <Footer navigate={navigate} />
        <EmailPromptModal />
      </div>
    </AuthProvider>
  );
}
