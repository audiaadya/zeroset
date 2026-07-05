import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import AuthModal from './AuthModal';
import ProfileMenu from './ProfileMenu';

interface Props {
  current: string;
  navigate: (to: string) => void;
}

const LINKS = [
  { href: '/', label: 'Current Week' },
  { href: '/archive', label: 'Archive' },
  { href: '/community', label: 'Community Sets' },
  { href: '/forum', label: 'Forum' },
  { href: '/sandbox', label: 'Sandbox' },
];

export default function Nav({ current, navigate }: Props) {
  const { user, signOut, isHost } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
    setOpen(false);
  };

  const isActive = (href: string) =>
    href === '/' ? current === '/' : current.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-900/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => go('/home')}
            className="group flex items-center gap-2.5 focus-ring rounded-md"
            aria-label="ZeroSet home"
          >
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-accent-400/60" />
              <span className="absolute inset-1.5 rounded-full border border-accent-400/30" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400 shadow-glow" />
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight text-ink-50">
              ZeroSet
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 sm:inline">
              / weekly math
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className={`focus-ring rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isActive(l.href)
                    ? 'text-accent-200'
                    : 'text-ink-300 hover:text-ink-100'
                }`}
              >
                {l.label}
              </button>
            ))}
            {isHost && (
              <button
                onClick={() => go('/host')}
                className={`focus-ring rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  current === '/host' ? 'text-accent-200' : 'text-ink-300 hover:text-ink-100'
                }`}
              >
                Host
              </button>
            )}
          </nav>

          <ProfileMenu navigate={go} onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />

          <button
            onClick={() => setOpen((v) => !v)}
            className="focus-ring rounded-md p-2 text-ink-200 md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-ink-700 bg-ink-900 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <button
                  key={l.href}
                  onClick={() => go(l.href)}
                  className={`focus-ring rounded-md px-3 py-2 text-left text-sm font-medium ${
                    isActive(l.href) ? 'text-accent-200' : 'text-ink-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              {isHost && (
                <button
                  onClick={() => go('/host')}
                  className={`focus-ring rounded-md px-3 py-2 text-left text-sm font-medium ${
                    current === '/host' ? 'text-accent-200' : 'text-ink-200'
                  }`}
                >
                  Host dashboard
                </button>
              )}
            </nav>
            <div className="mt-3 border-t border-ink-700 pt-3">
              {user ? (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { go('/me'); }}
                    className="focus-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-200 hover:text-accent-200"
                  >
                    Account stats
                  </button>
                  {isHost && (
                    <button
                      onClick={() => { go('/host'); }}
                      className="focus-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-200 hover:text-accent-200"
                    >
                      Host dashboard
                    </button>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                    className="focus-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-300"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => openAuth('signin')}
                    className="focus-ring flex-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="focus-ring flex-1 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-2 text-sm font-semibold text-accent-200"
                  >
                    Join
                  </button>
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
