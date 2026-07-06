import { useEffect, useRef, useState } from 'react';
import { ChevronDown, User, BarChart3, Settings, LogOut, Crown, Layers } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Props {
  navigate: (to: string) => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function ProfileMenu({ navigate, onSignIn, onSignUp }: Props) {
  const { user, signOut, isHost } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <button
          onClick={onSignIn}
          className="focus-ring rounded-md px-3 py-1.5 text-sm text-ink-200 transition hover:text-ink-50"
        >
          Sign in
        </button>
        <button
          onClick={onSignUp}
          className="focus-ring rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
        >
          Join
        </button>
      </div>
    );
  }

  const name =
    (user.user_metadata as { display_name?: string })?.display_name ||
    user.email?.split('@')[0] ||
    'mathlete';

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs text-ink-200 transition hover:border-ink-600"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent-400/40 bg-accent-400/10 font-mono text-[10px] font-semibold text-accent-300">
          {name[0]?.toUpperCase()}
        </span>
        <span className="max-w-[10rem] truncate font-mono">{name}</span>
        {isHost && <Crown className="h-3 w-3 text-accent-400" />}
        <ChevronDown className={`h-3.5 w-3.5 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-fade-in overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-panel">
          <div className="border-b border-ink-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-400/40 bg-accent-400/10 font-mono text-sm font-semibold text-accent-300">
                {name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm text-ink-100">{name}</div>
                <div className="truncate text-[10px] text-ink-500">{user.email}</div>
              </div>
            </div>
            {isHost && (
              <span className="mt-2 inline-flex items-center gap-1 rounded border border-accent-400/30 bg-accent-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300">
                <Crown className="h-2.5 w-2.5" /> Host
              </span>
            )}
          </div>
          <div className="p-1.5">
            <MenuItem icon={<BarChart3 className="h-4 w-4" />} label="Account stats" onClick={() => { setOpen(false); navigate('/me'); }} />
            {isHost && (
              <MenuItem icon={<Layers className="h-4 w-4" />} label="Host dashboard" onClick={() => { setOpen(false); navigate('/host'); }} />
            )}
            <MenuItem icon={<User className="h-4 w-4" />} label="My community sets" onClick={() => { setOpen(false); navigate('/community'); }} />
            <MenuItem icon={<Settings className="h-4 w-4" />} label="Profile settings" onClick={() => { setOpen(false); navigate('/me/settings'); }} />
            <div className="my-1.5 border-t border-ink-700" />
            <MenuItem
              icon={<LogOut className="h-4 w-4" />}
              label="Sign out"
              danger
              onClick={() => { setOpen(false); signOut(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
        danger ? 'text-ink-300 hover:bg-red-500/10 hover:text-red-300' : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-accent-400'}>{icon}</span>
      {label}
    </button>
  );
}
