import { useEffect, useState } from 'react';
import { Eraser, Save, Copy, Check } from 'lucide-react';
import MathText from '../components/MathText';

const STORAGE_KEY = 'zeroset:sandbox';

const DEFAULT = `# LaTeX Sandbox

Write Markdown + LaTeX here. Inline math with single dollar signs: $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$.

Block math with double dollar signs:

$$\\int_0^1 x^2 \\, dx = \\frac{1}{3}.$$

Try a matrix:

$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}, \\quad \\det A = -2.$$

Or an aligned derivation:

$$\\begin{aligned} (a+b)^2 &= (a+b)(a+b) \\\\ &= a^2 + 2ab + b^2. \\end{aligned}$$
`;

export default function SandboxPage() {
  const [src, setSrc] = useState(DEFAULT);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim().length > 0) setSrc(saved);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, src);
      setSavedAt(Date.now());
    }, 600);
    return () => clearTimeout(id);
  }, [src]);

  const clear = () => {
    if (!confirm('Clear the sandbox? This deletes your local draft.')) return;
    setSrc('');
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
  };

  const copy = () => {
    navigator.clipboard.writeText(src).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          LaTeX Sandbox
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Scratchpad</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Test complex formatting, matrices, aligned derivations, and math blocks before posting
          to the forum or submitting as a solution. Auto-saves to your browser — no account needed.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={copy}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-accent-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy source'}
        </button>
        <button
          onClick={clear}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-300"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-ink-500">
          {savedAt ? (
            <>
              <Save className="h-3 w-3 text-accent-400" />
              saved {new Date(savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </>
          ) : (
            'auto-saves locally'
          )}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          rows={24}
          spellCheck={false}
          className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-950 p-4 font-mono text-sm leading-relaxed text-ink-100 placeholder:text-ink-500"
          placeholder="Write Markdown + LaTeX here…"
        />
        <div className="min-h-[24rem] overflow-y-auto rounded-md border border-ink-700 bg-ink-900 p-4">
          {src.trim() ? (
            <MathText>{src}</MathText>
          ) : (
            <span className="text-sm text-ink-500">Live preview appears here as you type.</span>
          )}
        </div>
      </div>
    </div>
  );
}
