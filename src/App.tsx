import { AuthProvider } from './lib/AuthContext';
import { matchRoute, useRouter } from './lib/router';
import Nav from './components/Nav';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArchivePage from './pages/ArchivePage';
import ForumPage, { ForumTopicPage } from './pages/ForumPage';
import ThreadPage from './pages/ThreadPage';
import LandingPage from './pages/LandingPage';
import HostDashboardPage from './pages/HostDashboardPage';
import CommunitySetsPage from './pages/CommunitySetsPage';
import CommunitySetPage from './pages/CommunitySetPage';
import AccountStatsPage from './pages/AccountStatsPage';
import SettingsPage from './pages/SettingsPage';
import SandboxPage from './pages/SandboxPage';
import SkillTreePage from './pages/SkillTreePage';

function Routes() {
  const { route, navigate } = useRouter();
  const path = route.path;

  if (path === '/' || path === '') {
    return <HomePage navigate={navigate} />;
  }
  if (path === '/home') {
    return <LandingPage navigate={navigate} />;
  }
  if (path === '/archive') {
    return <ArchivePage />;
  }
  if (path === '/forum') {
    return <ForumPage navigate={navigate} />;
  }
  if (path === '/host') {
    return <HostDashboardPage navigate={navigate} />;
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
  if (path === '/sandbox') {
    return <SandboxPage />;
  }
  if (path === '/skill-tree') {
    return <SkillTreePage />;
  }

  const sandboxMatch = matchRoute(path, '/sandbox/:token');
  if (sandboxMatch) {
    return <SandboxPage />;
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
        onClick={() => navigate('/')}
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
      <div className="flex min-h-screen flex-col bg-ink-900 text-ink-100">
        <Nav current={route.path} navigate={navigate} />
        <main className="flex-1">
          <Routes />
        </main>
        <Footer navigate={navigate} />
      </div>
    </AuthProvider>
  );
}
