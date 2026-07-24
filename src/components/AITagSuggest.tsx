import { useState } from 'react';
import { Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { MATH_TAGS } from './ProblemTags';

interface Props {
  problemId: string;
  statement: string;
  onApplyTag?: (tag: string) => void;
  appliedTags?: string[];
}

const KEYWORD_MAP: Record<string, string[]> = {
  induction: ['induct', 'base case', 'inductive step', 'induction hypothesis', 'strong induction'],
  recurrence: ['recurrence', 'a_n', 'a_{n', 'linear recurrence', 'characteristic', 'fibonacci', 'recursive'],
  'gen-func': ['generating function', 'gen func', 'power series', 'f(x) = sum', 'coefficient'],
  vieta: ['vieta', 'roots of polynomial', 'sum of roots', 'product of roots', 'quadratic'],
  'am-gm': ['am-gm', 'arithmetic mean', 'geometric mean', 'am ≥ gm', 'am-gm'],
  cauchy: ['cauchy', 'cauchy-schwarz', 'cs inequality', 'schwarz'],
  smoothing: ['smoothing', 'convexity', 'jensen', 'concave', 'convex'],
  lte: ['lte', 'lifting the exponent'],
  fermat: ["fermat's little", 'fermat little', 'flt', 'fermat theorem'],
  'euler-totient': ['euler totient', 'phi(n)', 'totient', 'euler phi'],
  modular: ['mod', 'modular', 'congruence', 'mod p', 'residue'],
  diophantine: ['diophantine', 'integer solution', 'integer solutions', 'bezout'],
  inversion: ['inversion', 'inversive', 'circle inversion'],
  homothety: ['homothety', 'dilation', 'scaling'],
  'power-point': ['power of a point', 'power of point', 'radical axis'],
  'ceva-menelaus': ['ceva', 'menelaus', 'mass points'],
  'trig-geo': ['trig', 'sine', 'cosine', 'tangent', 'sin ', 'cos ', 'tan ', 'law of sines', 'law of cosines'],
  'complex-geo': ['complex number', 'complex plane', 'argand', 'modulus', 'conjugate'],
  'combinatorial-geo': ['convex hull', 'convex polygon', 'general position', 'lattice point'],
  limits: ['limit', 'lim_', 'converge', 'convergence', 'epsilon', 'delta'],
  integrals: ['integral', 'integrate', 'integration', 'dx', 'antiderivative'],
  derivatives: ['derivative', 'differentiate', 'differentiation', "f'(x)", 'critical point'],
  pigeonhole: ['pigeonhole', 'pigeon hole', 'worst case'],
  'stars-bars': ['stars and bars', 'stars-bars', 'balls and bins', 'combinations with repetition'],
  'inclusion-exclusion': ['inclusion-exclusion', 'inclusion exclusion', 'pie', 'overcounting'],
  bijection: ['bijection', 'bijective', 'one-to-one correspondence', 'counting'],
  probability: ['probability', 'expected value', 'random', 'stochastic', 'markov'],
  graph: ['graph', 'tree', 'path', 'cycle', 'vertex', 'edge', 'connected'],
  number: ['prime', 'divisor', 'gcd', 'lcm', 'coprime', 'divisibility'],
  inequality: ['inequality', '≤', '≥', 'maximize', 'minimize', 'optimize', 'bound'],
  polynomial: ['polynomial', 'coefficient', 'degree', 'factor', 'root'],
  sequence: ['sequence', 'series', 'partial sum', 'telescoping'],
  geometry: ['triangle', 'circle', 'square', 'polygon', 'angle', 'perpendicular', 'parallel', 'bisector', 'altitude'],
  algebra: ['solve', 'equation', 'system', 'substitution', 'elimination', 'matrix'],
  combinatorics: ['permutation', 'combination', 'arrangement', 'partition', 'subset'],
};

function suggestTags(statement: string): string[] {
  const lower = statement.toLowerCase();
  const hits = new Set<string>();
  for (const [tagId, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const tagInfo = MATH_TAGS.find((t) => t.id === tagId);
        if (tagInfo) hits.add(tagInfo.name);
        hits.add(tagId);
        break;
      }
    }
  }
  return Array.from(hits).slice(0, 8);
}

export default function AITagSuggest({ problemId, statement, onApplyTag, appliedTags: initialApplied = [] }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [appliedTags, setAppliedTags] = useState<string[]>(initialApplied);
  const [error, setError] = useState<string | null>(null);

  const applyTag = async (tag: string) => {
    if (!problemId || appliedTags.includes(tag)) return;
    setError(null);
    const { error: insError } = await supabase.from('problem_tags').insert({ problem_id: problemId, tag });
    if (insError) {
      setError(insError.message);
      return;
    }
    setAppliedTags([...appliedTags, tag]);
    window.dispatchEvent(new CustomEvent('zeroset:tags-changed', { detail: { problemId } }));
    onApplyTag?.(tag);
  };

  const runScan = async () => {
    if (!statement.trim()) return;
    setLoading(true);
    setError(null);

    const tags = suggestTags(statement);
    setSuggestions(tags);
    setScanned(true);
    setLoading(false);

    if (isSupabaseConfigured && tags.length > 0 && problemId) {
      void supabase
        .from('ai_tag_suggestions')
        .insert({
          problem_id: problemId,
          statement_hash: Date.now().toString(16),
          suggested_tags: tags,
        })
        .then(() => undefined, () => undefined);
    }
  };

  const unapplied = suggestions.filter((s) => !appliedTags.includes(s));

  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-300">
          <Sparkles className="h-3.5 w-3.5 text-accent-400" />
          AI Tag Suggestions
        </div>
        <button
          onClick={runScan}
          disabled={loading || !statement.trim()}
          className="flex items-center gap-1.5 rounded border border-accent-400/40 bg-accent-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-200 hover:bg-accent-400/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {scanned ? 'Re-scan' : 'Auto-suggest'}
        </button>
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </div>
      )}

      {scanned && (
        <div className="mt-2">
          {unapplied.length === 0 ? (
            <p className="text-xs text-ink-500">
              {suggestions.length === 0
                ? 'No tags detected. Try writing more of the problem statement or re-scan.'
                : 'All suggested tags have been applied.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unapplied.map((tag) => (
                <button
                  key={tag}
                  onClick={() => applyTag(tag)}
                  className="flex items-center gap-1 rounded-full border border-accent-400/40 bg-accent-400/10 px-2 py-0.5 text-xs text-accent-200 hover:bg-accent-400/20"
                >
                  <Plus className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}
          {suggestions.length > 0 && (
            <p className="mt-1.5 text-[10px] text-ink-500">
              Click a tag to add it. Suggestions are based on keywords in your statement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
