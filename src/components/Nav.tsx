import { useState, useRef, useEffect } from 'react';
import { Menu, X, Settings, LogOut, User, ChevronDown, LayoutDashboard, Users, BarChart3, LifeBuoy, Megaphone, Edit3, FileText, Layers, Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { sidebarLinksForRole, isStaff, type TeamRole } from '../lib/permissions';
import AuthModal from './AuthModal';
import Logo from './Logo';

interface Props {
  current: string;
  navigate: (to: string) => void;
}

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/current-week', label: 'Current Week' },
  { href: '/archive', label: 'Archive' },
  { href: '/community', label: 'Community' },
];

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: '/forum', label: 'Forum' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
];

const SIDEBAR_ICONS: Record<string, typeof Users> = {
  Layers, Users, BarChart3, LifeBuoy, Megaphone, Edit3, FileText, Settings, Shield,
};

export default function Nav({ current, navigate }: Props) {
  const { user, signOut, isHost, teamRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const go = (to: string) => { navigate(to); setMobileOpen(false); setAvatarOpen(false); };
  const sidebarLinks = sidebarLinksForRole(teamRole);
  const showStaffBadge = isStaff(teamRole);
  const openAuth = (mode: 'signin' | 'signup') => { setAuthMode(mode); setAuthOpen(true); setMobileOpen(false); };
  const isActive = (href: string) => current.startsWith(href);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-accent-400/30 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <button onClick={() => go('/')} className="flex items-center gap-2.5 text-accent-400" aria-label="ZeroSet home">
            <Logo size={26} />
            <span className="font-serif text-lg font-medium tracking-tight text-white"><span className="text-accent-400">Z</span>eroSet</span>
          </button>

          {/* Desktop nav — core 3 + secondary */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <button key={link.href} onClick={() => go(link.href)} className={`text-sm ${isActive(link.href) ? 'text-accent-400' : 'text-white'} hover:text-accent-300 transition-colors`}>
                {link.label}
              </button>
            ))}
            {SECONDARY_LINKS.map((link) => (
              <button key={link.href} onClick={() => go(link.href)} className={`text-sm ${isActive(link.href) ? 'text-accent-400' : 'text-white'} hover:text-accent-300 transition-colors`}>
                {link.label}
              </button>
            ))}
            {showStaffBadge && (
              <button onClick={() => go('/team')} className={`flex items-center gap-1.5 rounded-md border border-accent-400/40 bg-accent-400/10 px-3 py-1 text-sm font-semibold text-accent-300 transition hover:bg-accent-400/20 ${isActive('/team') ? 'ring-1 ring-accent-400/30' : ''}`}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Staff
              </button>
            )}
            {isHost && !showStaffBadge && (
              <button onClick={() => go('/host')} className={`flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20 ${isActive('/host') ? 'ring-1 ring-amber-400/30' : ''}`}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Host
              </button>
            )}
          </nav>

          {/* Desktop auth — avatar dropdown */}
          <div className="hidden items-center md:flex">
            {user ? (
              <div ref={avatarRef} className="relative">
                <button onClick={() => setAvatarOpen(!avatarOpen)} className="flex items-center gap-2 rounded-full border border-accent-400/30 bg-ink-850 px-2 py-1 transition hover:border-accent-400/60">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/20 font-mono text-xs font-semibold text-accent-300">
                    {(user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-deep">
                    <button onClick={() => go('/me')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-800">
                      <User className="h-4 w-4" /> Account
                    </button>
                    {showStaffBadge && (
                      <button onClick={() => go('/team')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-accent-300 hover:bg-ink-800">
                        <LayoutDashboard className="h-4 w-4" /> Staff Dashboard
                      </button>
                    )}
                    {isHost && !showStaffBadge && (
                      <button onClick={() => go('/host')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-300 hover:bg-ink-800">
                        <LayoutDashboard className="h-4 w-4" /> Host Dashboard
                      </button>
                    )}
                    <button onClick={() => go('/me/settings')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-800">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <div className="border-t border-ink-700" />
                    <button onClick={() => { signOut(); setAvatarOpen(false); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-300 hover:bg-ink-800">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => openAuth('signin')} className="text-sm text-white hover:text-accent-300 transition-colors">Sign in</button>
                <button onClick={() => openAuth('signup')} className="rounded-md border border-accent-400 bg-accent-400/25 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-400/40">Join</button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-md p-2 text-white md:hidden" aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="border-t border-accent-400/30 bg-ink-950 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {[...NAV_LINKS, ...SECONDARY_LINKS].map((link) => (
                <button key={link.href} onClick={() => go(link.href)} className={`text-left text-sm ${isActive(link.href) ? 'text-accent-400' : 'text-white'} hover:text-accent-300 transition-colors`}>
                  {link.label}
                </button>
              ))}
              {isHost && !showStaffBadge && <button onClick={() => go('/host')} className="text-left text-sm font-semibold text-amber-300">Host Dashboard</button>}
              {showStaffBadge && (
                <div className="mt-2 border-t border-ink-700 pt-2">
                  <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-ink-500">Staff Menu</div>
                  {sidebarLinks.map((link) => {
                    const Icon = SIDEBAR_ICONS[link.icon] ?? Users;
                    return (
                      <button key={link.href} onClick={() => go(link.href)} className={`flex w-full items-center gap-2 py-1.5 text-left text-sm ${isActive(link.href) ? 'text-accent-400' : 'text-ink-200'} hover:text-accent-300`}>
                        <Icon className="h-3.5 w-3.5" /> {link.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>
            <div className="mt-4 border-t border-ink-700 pt-4">
              {user ? (
                <div className="flex items-center justify-between">
                  <button onClick={() => go('/me')} className="flex items-center gap-2 text-sm text-white"><User className="h-4 w-4" /> Account</button>
                  <div className="flex gap-3">
                    <button onClick={() => go('/me/settings')} className="text-sm text-ink-200"><Settings className="h-4 w-4" /></button>
                    <button onClick={() => { signOut(); setMobileOpen(false); }} className="flex items-center gap-1.5 text-sm text-red-400"><LogOut className="h-4 w-4" /> Sign out</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => openAuth('signin')} className="flex-1 rounded-md border border-ink-700 py-2 text-sm text-white">Sign in</button>
                  <button onClick={() => openAuth('signup')} className="flex-1 rounded-md border border-accent-400 bg-accent-400/25 py-2 text-sm font-semibold text-white">Join</button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
    </>
  );
}
