interface Props {
  navigate: (to: string) => void;
}

export default function Footer({ navigate }: Props) {
  return (
    <footer className="mt-24 border-t-2 border-ink-800 bg-ink-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-accent-400/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              </span>
              <span className="font-handwritten text-base font-bold text-white">ZeroSet</span>
              <span className="ml-2 font-handwritten text-sm text-cream-100/60">zero-set.app</span>
            </div>
            <p className="mt-3 max-w-sm font-handwritten text-sm text-white">
              A weekly bundle of five math problems with a steep difficulty climb. Locked official
              proofs. A community of solvers.
            </p>
          </div>
          <div>
            <h4 className="font-handwritten text-xs font-bold uppercase tracking-[0.2em] text-white">Explore</h4>
            <ul className="mt-3 space-y-2 font-handwritten text-sm">
              <li>
                <button onClick={() => navigate('/')} className="text-white hover:text-accent-300">
                  Current Week
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/archive')} className="text-white hover:text-accent-300">
                  Archive
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/forum')} className="text-white hover:text-accent-300">
                  Forum
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-handwritten text-xs font-bold uppercase tracking-[0.2em] text-white">Project</h4>
            <ul className="mt-3 space-y-2 font-handwritten text-sm">
              <li>
                <button onClick={() => navigate('/community')} className="text-white hover:text-accent-300">
                  Community Sets
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="text-white hover:text-accent-300">
                  About
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-ink-800 pt-5 font-handwritten text-xs text-white">
          <span>© {new Date().getFullYear()} ZeroSet</span>
          <span className="mx-2">·</span>
          <span>A 501(c)(3) nonprofit organization.</span>
        </div>
      </div>
    </footer>
  );
}
