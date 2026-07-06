import { Network } from 'lucide-react';
import SkillTree from '../components/SkillTree';
import { useRouter } from '../lib/router';

export default function SkillTreePage() {
  const { navigate } = useRouter();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <Network className="h-3 w-3" />
          Skill Tree
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Mathematical Progression</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Unlock advanced topics by completing prerequisite skills. Each node represents a key mathematical
          concept you'll master through problem-solving.
        </p>
      </header>

      <SkillTree />

      <div className="mt-8 flex items-center justify-center">
        <button
          onClick={() => navigate('/')}
          className="focus-ring rounded-md border border-ink-700 px-4 py-2 text-sm text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          Back to current week
        </button>
      </div>
    </div>
  );
}
