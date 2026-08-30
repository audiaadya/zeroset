import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Tag, X, Plus } from 'lucide-react';

export const MATH_TAGS = [
  { id: 'pigeonhole', name: 'Pigeonhole Principle', subject: 'combinatorics' },
  { id: 'stars-bars', name: 'Stars and Bars', subject: 'combinatorics' },
  { id: 'inclusion-exclusion', name: 'Inclusion-Exclusion', subject: 'combinatorics' },
  { id: 'bijection', name: 'Bijection', subject: 'combinatorics' },
  { id: 'induction', name: 'Induction', subject: 'algebra' },
  { id: 'recurrence', name: 'Recurrence Relations', subject: 'algebra' },
  { id: 'gen-func', name: 'Generating Functions', subject: 'algebra' },
  { id: 'vieta', name: "Vieta's Formulas", subject: 'algebra' },
  { id: 'am-gm', name: 'AM-GM Inequality', subject: 'inequalities' },
  { id: 'cauchy', name: 'Cauchy-Schwarz', subject: 'inequalities' },
  { id: 'smoothing', name: 'Smoothing', subject: 'inequalities' },
  { id: 'lte', name: 'LTE Lemma', subject: 'number_theory' },
  { id: 'fermat', name: "Fermat's Little Theorem", subject: 'number_theory' },
  { id: 'euler-totient', name: "Euler's Totient", subject: 'number_theory' },
  { id: 'modular', name: 'Modular Arithmetic', subject: 'number_theory' },
  { id: 'diophantine', name: 'Diophantine Equations', subject: 'number_theory' },
  { id: 'inversion', name: 'Inversion', subject: 'geometry' },
  { id: 'homothety', name: 'Homothety', subject: 'geometry' },
  { id: 'power-point', name: 'Power of a Point', subject: 'geometry' },
  { id: 'ceva-menelaus', name: 'Ceva & Menelaus', subject: 'geometry' },
  { id: 'trig-geo', name: 'Trigonometry', subject: 'geometry' },
  { id: 'complex-geo', name: 'Complex Numbers', subject: 'geometry' },
  { id: 'combinatorial-geo', name: 'Combinatorial Geometry', subject: 'geometry' },
  { id: 'limits', name: 'Limits', subject: 'analysis' },
  { id: 'integrals', name: 'Integration', subject: 'analysis' },
  { id: 'derivatives', name: 'Differentiation', subject: 'analysis' },
] as const;

interface Props {
  problemId: string;
  editable?: boolean;
  filterable?: boolean;
  selectedTags?: string[];
  onTagClick?: (tag: string) => void;
}

export default function ProblemTags({ problemId, editable = false, filterable = false, selectedTags, onTagClick }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (problemId) {
      loadTags();
    }
    if (filterable) {
      loadAllTags();
    }
  }, [problemId, filterable]);

  // Listen for external tag additions (e.g. from AITagSuggest) so the UI
  // refreshes when another component inserts a tag for this problem.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { problemId?: string };
      if (detail?.problemId === problemId) loadTags();
    };
    window.addEventListener('zeroset:tags-changed', handler as EventListener);
    return () => window.removeEventListener('zeroset:tags-changed', handler as EventListener);
  }, [problemId]);

  const loadTags = async () => {
    const { data } = await supabase
      .from('problem_tags')
      .select('tag')
      .eq('problem_id', problemId);
    if (data) {
      setTags(data.map((t) => t.tag));
    }
  };

  const loadAllTags = async () => {
    const { data } = await supabase
      .from('problem_tags')
      .select('tag');
    if (data) {
      setAllTags([...new Set(data.map((t) => t.tag))]);
    }
  };

  const addTag = async (tag: string) => {
    if (!tag.trim() || tags.includes(tag)) return;
    const { error } = await supabase
      .from('problem_tags')
      .insert({ problem_id: problemId, tag: tag.trim() });
    if (!error) {
      setTags([...tags, tag.trim()]);
      setNewTag('');
      setShowAdd(false);
    }
  };

  const removeTag = async (tag: string) => {
    const { error } = await supabase
      .from('problem_tags')
      .delete()
      .eq('problem_id', problemId)
      .eq('tag', tag);
    if (!error) {
      setTags(tags.filter((t) => t !== tag));
    }
  };

  const getTagStyle = (tag: string) => {
    const tagInfo = MATH_TAGS.find((t) => t.id === tag.toLowerCase().replace(/\s|-/g, '') || t.name === tag);
    const subject = tagInfo?.subject || 'general';
    const styles: Record<string, string> = {
      combinatorics: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      algebra: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
      inequalities: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      number_theory: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      geometry: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
      analysis: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    };
    return styles[subject] || 'bg-ink-700/50 text-ink-300 border-ink-600';
  };

  if (filterable && !problemId) {
    return (
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className={`rounded-full border px-2 py-0.5 text-xs transition ${
              selectedTags?.includes(tag)
                ? 'bg-accent-400/20 text-accent-200 border-accent-400/40'
                : getTagStyle(tag) + ' hover:brightness-110'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag className="h-3.5 w-3.5 text-ink-500" />
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={() => filterable && onTagClick?.(tag)}
          className={`rounded-full border px-2 py-0.5 text-xs ${getTagStyle(tag)} ${
            filterable ? 'cursor-pointer hover:brightness-110' : ''
          }`}
        >
          {tag}
          {editable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-1 text-ink-400 hover:text-red-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {editable && (
        <>
          {showAdd ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
                className="w-24 rounded border border-ink-700 bg-ink-900 px-2 py-0.5 text-xs text-ink-100"
                placeholder="Tag..."
                autoFocus
              />
              <button
                onClick={() => addTag(newTag)}
                className="rounded bg-accent-400/20 px-1.5 py-0.5 text-xs text-accent-200"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-xs text-ink-500 hover:text-ink-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-full border border-dashed border-ink-600 px-2 py-0.5 text-xs text-ink-500 hover:border-accent-400/40 hover:text-accent-200"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </>
      )}
      {tags.length === 0 && !editable && (
        <span className="text-xs text-ink-500">No tags</span>
      )}
    </div>
  );
}
