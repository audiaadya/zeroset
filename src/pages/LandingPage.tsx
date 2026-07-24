import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import ProofCanvas from '../components/ProofCanvas';
import CommunitySpotlight from '../components/CommunitySpotlight';

interface Props {
  navigate: (to: string) => void;
}

const TYPEWRITER_TEXT = 'ZeroSet';
const DISCORD_URL = 'https://discord.gg/fzRghVuktQ';

export default function LandingPage({ navigate }: Props) {
  const { isHost, user } = useAuth();
  const [typed, setTyped] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (i <= TYPEWRITER_TEXT.length) {
        setTyped(TYPEWRITER_TEXT.slice(0, i));
        i++;
      } else {
        clearInterval(id);
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Hero — split: left text, right vertical screenshot */}
      <section className="grid items-center gap-8 pt-20 pb-12 sm:pt-28 md:grid-cols-2">
        {/* Left half */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            Weekly math, handwritten
          </span>

          <h1 className="mt-6 font-serif text-5xl italic font-medium leading-[1.05] text-accent-300 sm:text-6xl">
            <span className={showCursor ? 'typewriter-caret' : ''}>{typed}</span>
          </h1>

          <p className="mt-6 max-w-md text-base text-ink-200">
            Five original, handwritten math problems every week. Solve them, then create your own
            weekly set for the community to tackle.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/current-week')}
              className="btn-ink focus-ring group flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-5 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
            >
              <span>This week's bundle</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate('/community')}
              className="btn-sketch focus-ring rounded-md border border-accent-400/40 px-5 py-2.5 text-sm text-accent-200 transition hover:border-accent-400 hover:text-accent-100"
            >
              Create your own set
            </button>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400/40 bg-accent-400/5 px-4 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/15 hover:text-accent-100"
            >
              <MessageCircle className="h-4 w-4" />
              Join Discord
            </a>
            {isHost && (
              <button
                onClick={() => navigate('/host')}
                className="focus-ring rounded-md border border-accent-400/40 bg-accent-400/5 px-4 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/15"
              >
                Host dashboard
              </button>
            )}
          </div>
        </div>

        {/* Right half — interactive canvas proof */}
        <div className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl border border-accent-400/30 bg-ink-950/80 shadow-deep md:justify-self-end">
          <ProofCanvas />
        </div>
      </section>

      {/* Community spotlight — trending + staff pick */}
      <CommunitySpotlight navigate={navigate} />

      {/* Features — short, editorial, no grid */}
      <section className="space-y-12 py-12">
        <div className="border-l-2 border-accent-400/60 pl-4">
          <h3 className="font-serif text-xl text-accent-200">Submit your own proofs</h3>
          <p className="mt-2 text-sm text-ink-300">
            Write solutions in Markdown with full LaTeX support. You can't see other people's work
            until you've submitted your own. Edit or delete anytime before the reveal.
          </p>
        </div>
        <div className="border-l-2 border-accent-400/60 pl-4">
          <h3 className="font-serif text-xl text-accent-200">Archive, permanently unlocked</h3>
          <p className="mt-2 text-sm text-ink-300">
            Once a week's timer expires, the set moves to the archive with every official answer
            and proof permanently unlocked.
          </p>
        </div>
        <div className="border-l-2 border-accent-400/60 pl-4">
          <h3 className="font-serif text-xl text-accent-200">Run your own weekly bundle</h3>
          <p className="mt-2 text-sm text-ink-300">
            Anyone can create a Community Set. Write five problems, set a publish and reveal time,
            and let others solve.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="font-serif text-2xl italic text-accent-200">Ready to climb?</h2>
        <p className="mt-2 text-sm text-ink-300">
          {user
            ? "Jump into this week's bundle."
            : 'Sign in to submit solutions and join the community.'}
        </p>
        <button
          onClick={() => navigate('/current-week')}
          className="btn-ink focus-ring mt-5 flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-5 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
        >
          <span>This week's bundle</span> <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
