import { useState } from 'react';
import { FileDown, Loader2, Award } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface ProblemJoin {
  title: string | null;
  statement: string | null;
  difficulty: string | null;
}

interface SolutionExport {
  id: string;
  body: string;
  created_at: string;
  is_correct: boolean;
  problem_id: string;
  problems: ProblemJoin | null;
}

interface Props {
  onExport?: () => void;
}

export default function QEDJournalExport({ onExport }: Props) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'markdown' | 'html'>('markdown');

  const exportJournal = async () => {
    if (!user) return;
    setExporting(true);

    const { data: solutions } = await supabase
      .from('solutions')
      .select(`
        id,
        body,
        created_at,
        is_correct,
        problem_id,
        problems:problem_id(title, statement, difficulty)
      `)
      .eq('author_id', user.id)
      .eq('is_correct', true)
      .order('created_at', { ascending: true });

    if (!solutions || solutions.length === 0) {
      alert('No correct solutions to export.');
      setExporting(false);
      return;
    }

    const displayName = (user.user_metadata as { display_name?: string })?.display_name || user.email?.split('@')[0] || 'Mathlete';

    if (format === 'markdown') {
      const markdown = generateMarkdown(solutions, displayName);
      downloadFile(markdown, 'qed-journal.md', 'text/markdown');
    } else {
      const html = generateHTML(solutions, displayName);
      downloadFile(html, 'qed-journal.html', 'text/html');
    }

    setExporting(false);
    onExport?.();
  };

  const generateMarkdown = (solutions: SolutionExport[], name: string): string => {
    const lines: string[] = [
      `# Q.E.D. Journal`,
      `## ${name}'s Verified Solutions`,
      ``,
      `*Exported on ${new Date().toLocaleDateString()}*`,
      ``,
      `---`,
      ``,
    ];

    solutions.forEach((s, i) => {
      const problem = s.problems;
      lines.push(`### Problem ${i + 1}: ${problem?.title || s.problem_id}`);
      lines.push(`**Difficulty:** ${problem?.difficulty || 'Unknown'}`);
      lines.push(`**Date Solved:** ${new Date(s.created_at).toLocaleDateString()}`);
      lines.push(``);
      if (problem?.statement) {
        lines.push(`**Statement:**`);
        lines.push(problem.statement);
        lines.push(``);
      }
      lines.push(`**My Solution:**`);
      lines.push(s.body);
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
    });

    lines.push(`*Total: ${solutions.length} verified solutions*`);

    return lines.join('\n');
  };

  const generateHTML = (solutions: SolutionExport[], name: string): string => {
    const solutionItems = solutions.map((s, i) => {
      const problem = s.problems;
      return `
        <article class="solution" style="margin-bottom: 2rem; page-break-inside: avoid;">
          <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Problem ${i + 1}: ${problem?.title || s.problem_id}</h3>
          <div style="color: #666; margin-bottom: 1rem;">
            <span class="difficulty">${problem?.difficulty || 'Unknown'}</span> ·
            <span class="date">${new Date(s.created_at).toLocaleDateString()}</span>
          </div>
          ${problem?.statement ? `
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
              <strong>Statement:</strong>
              <p style="margin-top: 0.5rem;">${problem.statement}</p>
            </div>
          ` : ''}
          <div style="line-height: 1.8;">
            ${s.body}
          </div>
        </article>
      `;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Q.E.D. Journal - ${name}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 2rem; text-align: center; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; text-align: center; color: #666; font-weight: normal; margin-bottom: 2rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1rem; }
    .difficulty {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    code { font-family: monospace; background: #f5f5f5; padding: 0.125rem 0.25rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    blockquote { border-left: 3px solid #ccc; padding-left: 1rem; margin-left: 0; color: #666; }
    article { border-bottom: 1px solid #eee; padding-bottom: 1.5rem; }
    @media print {
      body { padding: 0; }
      article { page-break-inside: avoid; }
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ]
      });
    });
  </script>
</head>
<body>
  <h1>Q.E.D. Journal</h1>
  <h2>${name}'s Verified Solutions</h2>
  <p style="text-align: center; color: #666;">Exported on ${new Date().toLocaleDateString()}</p>
  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #eee;">
  ${solutionItems}
  <footer style="text-align: center; color: #999; margin-top: 2rem;">
    <p>Total: ${solutions.length} verified solutions</p>
  </footer>
</body>
</html>`;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-400" />
        <h4 className="font-serif text-lg text-ink-50">Q.E.D. Journal Export</h4>
      </div>
      <p className="text-sm text-ink-400">
        Export all your verified correct solutions as a beautiful, print-ready document.
      </p>
      <div className="flex items-center gap-3">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'markdown' | 'html')}
          className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
        >
          <option value="markdown">Markdown (.md)</option>
          <option value="html">HTML (.html)</option>
        </select>
        <button
          onClick={exportJournal}
          disabled={exporting || !user}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export my Journal
        </button>
      </div>
    </div>
  );
}
