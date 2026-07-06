import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface Props {
  solution: string;
  onFeedback?: (feedback: string) => void;
}

export default function AIPSanityChecker({ solution, onFeedback }: Props) {
  const { configured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSolution = async () => {
    if (!solution.trim() || solution.length < 20) {
      setError('Write a bit more before running a sanity check.');
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('proof-sanity-check', {
        body: { solution },
      });

      if (fnError) throw fnError;

      setFeedback(data?.feedback || 'No issues detected.');
      onFeedback?.(data?.feedback);
    } catch (err) {
      // If edge function doesn't exist, do a lightweight client-side check
      const basicCheck = performBasicCheck(solution);
      setFeedback(basicCheck);
      onFeedback?.(basicCheck);
    } finally {
      setLoading(false);
    }
  };

  const performBasicCheck = (text: string): string => {
    const issues: string[] = [];

    const lowerText = text.toLowerCase();

    if (lowerText.includes('obviously') || lowerText.includes('trivially') || lowerText.includes('clearly')) {
      const trivialMatches = text.match(/\b(obviously|trivially|clearly)\b[^.]*\./gi);
      if (trivialMatches) {
        issues.push('Warning: Using "obviously", "trivially", or "clearly" without justification may hide gaps in reasoning.');
      }
    }

    if (lowerText.includes('suppose') && lowerText.includes('therefore') && !lowerText.includes('assume')) {
      const hasContradiction = lowerText.includes('contradiction');
      if (!hasContradiction) {
        issues.push('Note: You appear to be using a "suppose...therefore" structure. Consider whether this is a direct proof or proof by contradiction.');
      }
    }

    const hasQuantifiers = /\b(for all|for any|for every|there exists|there is)\b/i.test(text);
    const hasVariables = /\$[a-z]|\$[a-z]_{|\$\\\\forall|\$\\\\exists/i.test(text);
    if (hasQuantifiers && !hasVariables) {
      issues.push('Tip: Consider using quantifier notation (\\forall, \\exists) for clarity.');
    }

    if (!lowerText.includes('base case') && lowerText.includes('induction')) {
      issues.push('Reminder: Induction proofs typically need an explicit base case.');
    }

    if (issues.length === 0) {
      return 'No common proof fallacies detected. Structure looks reasonable.';
    }

    return issues.map((i) => '• ' + i).join('\n');
  };

  if (!configured) return null;

  return (
    <div className="mt-3 rounded-md border border-ink-700 bg-ink-900/50 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-ink-400">
          <Sparkles className="h-3.5 w-3.5 text-accent-400" />
          Proof Sanity Check
        </span>
        <button
          onClick={checkSolution}
          disabled={loading || !solution.trim()}
          className="focus-ring flex items-center gap-1.5 rounded border border-accent-400/40 bg-accent-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-accent-300 hover:bg-accent-400/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="mt-2 rounded border border-accent-400/30 bg-accent-400/5 px-2 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-ink-300 whitespace-pre-wrap">{feedback}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-ink-500 hover:text-ink-300 shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
