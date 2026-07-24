import { MessageCircle } from 'lucide-react';
import Logo from './Logo';

const DISCORD_URL = 'https://discord.gg/fzRghVuktQ';

interface Props {
  navigate: (to: string) => void;
}

export default function Footer({ navigate }: Props) {
  return (
    <footer className="mt-24 border-t border-accent-400/20 bg-ink-950/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 text-accent-400">
              <Logo size={28} />
              <span className="font-serif text-base font-medium text-white"><span className="text-accent-400">Z</span>eroSet</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-ink-100/70">
              A weekly bundle of five math problems with a steep difficulty climb. Locked official
              proofs. A community of solvers.
            </p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-accent-400/50 bg-accent-400/10 px-3 py-1.5 text-xs font-semibold text-accent-200 transition hover:bg-accent-400/20 hover:text-accent-100"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Join us on Discord
            </a>
          </div>
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-400">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/current-week')} className="text-ink-100/70 hover:text-accent-300">
                  Current Week
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/archive')} className="text-ink-100/70 hover:text-accent-300">
                  Archive
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/forum')} className="text-ink-100/70 hover:text-accent-300">
                  Forum
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-400">Project</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/community')} className="text-ink-100/70 hover:text-accent-300">
                  Community Sets
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/partners')} className="text-ink-100/70 hover:text-accent-300">
                  Partners
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="text-ink-100/70 hover:text-accent-300">
                  About
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-accent-400/15 pt-5 text-xs text-ink-100/50">
          <span className="font-mono">© {new Date().getFullYear()} ZeroSet</span>
        </div>
      </div>
    </footer>
  );
}
