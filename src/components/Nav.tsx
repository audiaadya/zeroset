import { useEffect, useState } from 'react';
import { Menu, X, Sparkles, Heart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import ProfileMenu from './ProfileMenu';
import Logo from './Logo';
import AuthModal from './AuthModal';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Current Week' },
  { href: '/archive', label: 'Archive' },
  { href: '/community', label: 'Community' },
  { href: '/contribute', label: 'Get Involved' },
];

interface Props {
  current: string;
  navigate: (to: string) => void;
}

export default function Nav({ navigate }: Props) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  const isActive = (href: string) => {
    const path = window.location.pathname;
    if (href === '/') return path === '/' || path === '' || path === '/home' || path === '/current-week';
    if (href === '/contribute') return path === '/contribute' || path === '/about';
    return path.startsWith(href);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b-2 border-ink-800 bg-ink-900/95 backdrop-blur-sm'
            : 'border-b border-ink-800/70 bg-ink-900/90 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => go('/')} className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-serif text-lg font-bold text-white">
              <span className="text-accent-400">Z</span>eroSet
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => go(link.href)}
                className={`px-3 py-1.5 font-handwritten text-sm font-bold uppercase tracking-wider transition ${
                  isActive(link.href)
                    ? 'highlighter text-white'
                    : 'text-cream-100 hover:text-accent-300'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <ProfileMenu
                navigate={navigate}
                onSignIn={() => setAuthOpen(true)}
                onSignUp={() => setAuthOpen(true)}
              />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-sketch-notebook flex items-center gap-1.5 px-3 py-1.5 font-handwritten text-sm font-bold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Sign in
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden btn-sketch-notebook p-1.5"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t-2 border-ink-800 bg-ink-900 sm:hidden">
            <nav className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => go(link.href)}
                  className={`px-3 py-2 text-left font-handwritten text-sm font-bold uppercase tracking-wider transition ${
                    isActive(link.href)
                      ? 'highlighter text-white'
                      : 'text-cream-100 hover:text-accent-300'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode="signin" />
    </>
  );
}
