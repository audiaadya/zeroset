import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

export interface SkillNode {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string;
  order_index: number;
  required_xp: number;
  problem_ids: string[];
  completed?: boolean;
  prerequisites?: string[];
}

interface Props {
  onSelectNode?: (node: SkillNode) => void;
}

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  algebra: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-300' },
  number_theory: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300' },
  combinatorics: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  geometry: { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-300' },
  analysis: { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-300' },
  general: { bg: 'bg-ink-500/20', border: 'border-ink-500/40', text: 'text-ink-300' },
};

const SUBJECT_ORDER = ['general', 'algebra', 'number_theory', 'combinatorics', 'geometry', 'analysis'];

export default function SkillTree({ onSelectNode }: Props) {
  const { user, configured } = useAuth();
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [prereqs, setPrereqs] = useState<Record<string, string[]>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, configured]);

  const loadData = async () => {
    setLoading(true);
    const { data: nodesData } = await supabase
      .from('skill_nodes')
      .select('*')
      .order('order_index', { ascending: true });

    const { data: prereqsData } = await supabase
      .from('skill_node_prerequisites')
      .select('node_id, prerequisite_id');

    const prereqMap: Record<string, string[]> = {};
    (prereqsData || []).forEach((p: { node_id: string; prerequisite_id: string }) => {
      if (!prereqMap[p.node_id]) prereqMap[p.node_id] = [];
      prereqMap[p.node_id].push(p.prerequisite_id);
    });
    setPrereqs(prereqMap);

    if (user) {
      const { data: progressData } = await supabase
        .from('user_skill_progress')
        .select('node_id, completed')
        .eq('user_id', user.id);

      const progressMap: Record<string, boolean> = {};
      (progressData || []).forEach((p: { node_id: string; completed: boolean }) => {
        progressMap[p.node_id] = p.completed;
      });
      setProgress(progressMap);
    }

    if (nodesData) {
      setNodes(nodesData as SkillNode[]);
    }
    setLoading(false);
  };

  const isNodeUnlocked = (node: SkillNode): boolean => {
    const nodePrereqs = prereqs[node.id] || [];
    if (nodePrereqs.length === 0) return true;
    return nodePrereqs.every((pid) => progress[pid]);
  };

  const filteredNodes = selectedSubject === 'all'
    ? nodes
    : nodes.filter((n) => n.subject === selectedSubject);

  const grouped = SUBJECT_ORDER.reduce((acc, subject) => {
    const subjectNodes = filteredNodes.filter((n) => n.subject === subject);
    if (subjectNodes.length > 0) acc[subject] = subjectNodes;
    return acc;
  }, {} as Record<string, SkillNode[]>);

  if (loading) {
    return <div className="text-sm text-ink-400">Loading skill tree...</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-6 text-center">
        <p className="text-sm text-ink-400">
          The skill tree is being set up. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            selectedSubject === 'all'
              ? 'bg-accent-400/20 text-accent-200 border border-accent-400/40'
              : 'bg-ink-800 text-ink-400 hover:text-ink-200'
          }`}
        >
          All
        </button>
        {SUBJECT_ORDER.filter((s) => grouped[s]?.length > 0).map((subject) => {
          const colors = SUBJECT_COLORS[subject];
          return (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                selectedSubject === subject
                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                  : 'bg-ink-800 text-ink-400 hover:text-ink-200'
              }`}
            >
              {subject.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          );
        })}
      </div>

      {Object.entries(grouped).map(([subject, subjectNodes]) => (
        <div key={subject} className="space-y-3">
          <h3 className={`text-sm font-medium ${SUBJECT_COLORS[subject]?.text || 'text-ink-300'}`}>
            {subject.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectNodes.map((node) => {
              const unlocked = isNodeUnlocked(node);
              const completed = progress[node.id];
              const colors = SUBJECT_COLORS[node.subject];

              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode?.(node)}
                  disabled={!unlocked}
                  className={`relative rounded-lg border p-4 text-left transition ${
                    completed
                      ? `${colors.bg} ${colors.border}`
                      : unlocked
                        ? 'bg-ink-850/50 border-ink-700 hover:border-ink-600'
                        : 'bg-ink-900/30 border-ink-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      completed
                        ? `${colors.border} ${colors.bg}`
                        : unlocked
                          ? 'border-ink-600 bg-ink-800'
                          : 'border-ink-700 bg-ink-900'
                    }`}>
                      <span className={`text-xs font-mono ${completed ? colors.text : 'text-ink-400'}`}>
                        {node.order_index}
                      </span>
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${completed ? colors.text : unlocked ? 'text-ink-100' : 'text-ink-500'}`}>
                        {node.title}
                      </h4>
                      <p className="mt-1 text-xs text-ink-500 line-clamp-2">
                        {node.description || node.difficulty}
                      </p>
                    </div>
                  </div>
                  {completed && (
                    <div className="absolute right-2 top-2 text-accent-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute right-2 top-2 text-ink-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
