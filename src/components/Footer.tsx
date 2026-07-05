import { useAuth } from '../lib/AuthContext';

interface Props {
  navigate: (to: string) => void;
}

export default function Footer({ navigate }: Props) {
  const { configured } = useAuth();
  return (
    <footer className="mt-24 border-t border-ink-700/70 bg-ink-950/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-accent-400/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              </span>
              <span className="font-serif text-base font-semibold text-ink-50">ZeroSet</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-ink-400">
              A weekly bundle of five math problems with a steep difficulty climb. Locked official
              proofs. A community of solvers.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/')} className="text-ink-300 hover:text-accent-300">
                  Current Week
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/archive')} className="text-ink-300 hover:text-accent-300">
                  Archive
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/forum')} className="text-ink-300 hover:text-accent-300">
                  Forum
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Project</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/community')} className="text-ink-300 hover:text-accent-300">
                  Community Sets
                </button>
              </li>
              <li className="text-ink-400">
                Status:{' '}
                <span className={configured ? 'text-accent-300' : 'text-yellow-300'}>
                  {configured ? 'Supabase connected' : 'Demo mode'}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-ink-800 pt-5 text-xs text-ink-500">
          <span className="font-mono">© {new Date().getFullYear()} ZeroSet</span>
          <span className="mx-2">·</span>
          <span>Built for GitHub Pages. Static frontend + Supabase backend.</span>
        </div>
      </div>
    </footer>
  );
}
