// Markdown renderer with real LaTeX rendering via KaTeX.
// Supports: headings, bold, italic, inline code, code blocks, links,
// blockquotes, lists. Math markers ($...$ / $$...$$) are typeset with KaTeX.
// Bare LaTeX commands (e.g. \log_{\sqrt{4}}\left(64\sqrt{4}\right)) are also
// auto-detected and rendered even without $ delimiters.

import katex from 'katex';

type RenderOptions = { throwOnError?: boolean };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMath(latex: string, displayMode: boolean): string {
  const cls = displayMode
    ? 'math-block my-3 block overflow-x-auto'
    : 'math-inline';
  const tag = displayMode ? 'div' : 'span';
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      trust: false,
      strict: 'ignore',
    });
    return `<${tag} class="${cls}">${html}</${tag}>`;
  } catch {
    const fallbackCls = displayMode
      ? 'math-block my-3 block rounded-md border border-ink-700 bg-ink-900/60 px-3 py-2 font-mono text-sm text-accent-200 overflow-x-auto'
      : 'math-inline rounded bg-ink-800/60 px-1 py-0.5 font-mono text-[0.9em] text-accent-200';
    return `<${tag} class="${fallbackCls}">${escapeHtml(latex)}</${tag}>`;
  }
}

// Known LaTeX command names — used to detect bare (un-delimited) LaTeX.
const LATEX_COMMAND = /\\(log|sqrt|frac|left|right|sum|int|prod|lim|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|subset|supset|notin|cup|cap|forall|exists|mathbb|mathcal|mathbf|text|mathrm|vec|hat|bar|dot|ddot|tilde|overline|underline|widehat|widetilde|displaystyle|textstyle|dfrac|tfrac|binom|cfrac|substack|stackrel|overset|underset|sideset|raisebox|align|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array|subarray|smallmatrix|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|det|dim|gcd|max|min|sup|inf|deg|arg|hom|ker|exp)\b/;

// Given a position at a backslash starting a LaTeX command, scan forward and
// return the index just past the full expression (command + balanced
// braces/brackets/parens + ^_ subscripts + chained commands + trailing digits).
function scanLatex(src: string, start: number): number {
  let i = start + 1; // skip backslash
  while (i < src.length && /[a-zA-Z]/.test(src[i])) i++; // command name
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{' || ch === '[' || ch === '(') {
      const close = ch === '{' ? '}' : ch === '[' ? ']' : ')';
      let depth = 1;
      i++;
      while (i < src.length && depth > 0) {
        if (src[i] === ch) depth++;
        else if (src[i] === close) depth--;
        if (depth > 0) i++;
      }
      if (i < src.length && src[i] === close) i++;
    } else if (ch === '^' || ch === '_') {
      i++;
      if (src[i] === '{') {
        let depth = 1;
        i++;
        while (i < src.length && depth > 0) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          if (depth > 0) i++;
        }
        if (i < src.length && src[i] === '}') i++;
      } else if (src[i] === '\\') {
        i++;
        while (i < src.length && /[a-zA-Z]/.test(src[i])) i++;
      } else {
        i++;
      }
    } else if (ch === '\\' && LATEX_COMMAND.test(src.slice(i))) {
      i++;
      while (i < src.length && /[a-zA-Z]/.test(src[i])) i++;
    } else if (/[0-9]/.test(ch)) {
      while (i < src.length && /[0-9]/.test(src[i])) i++;
    } else {
      break;
    }
  }
  return i;
}

// Render math markers ($...$, $$...$$) and bare LaTeX in raw (un-escaped) text.
function processMath(src: string): string {
  let out = '';
  let i = 0;
  const D = '$'; // dollar delimiter
  while (i < src.length) {
    // Display math $$...$$
    if (src.startsWith(D + D, i)) {
      const end = src.indexOf(D + D, i + 2);
      if (end === -1) { out += src.slice(i); break; }
      out += renderMath(src.slice(i + 2, end).trim(), true);
      i = end + 2;
      continue;
    }
    // Inline math $...$
    if (src[i] === D) {
      const end = src.indexOf(D, i + 1);
      if (end === -1) { out += src.slice(i); break; }
      out += renderMath(src.slice(i + 1, end), false);
      i = end + 1;
      continue;
    }
    // Fenced code blocks
    if (src.startsWith('```', i)) {
      const end = src.indexOf('```', i + 3);
      if (end === -1) { out += src.slice(i); break; }
      const block = src.slice(i + 3, end);
      const nl = block.indexOf('\n');
      const lang = nl === -1 ? '' : block.slice(0, nl).trim();
      const code = nl === -1 ? block : block.slice(nl + 1);
      out += `<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code)}</code></pre>`;
      i = end + 3;
      continue;
    }
    // Inline code
    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end === -1) { out += src.slice(i); break; }
      out += `<code>${escapeHtml(src.slice(i + 1, end))}</code>`;
      i = end + 1;
      continue;
    }
    // Bare LaTeX command
    if (src[i] === '\\' && LATEX_COMMAND.test(src.slice(i))) {
      const end = scanLatex(src, i);
      out += renderMath(src.slice(i, end), false);
      i = end;
      continue;
    }
    out += src[i];
    i++;
  }
  return out;
}

function inlineMarkdown(src: string): string {
  let s = escapeHtml(src);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

// Split a line into math fragments (starting with $) and text fragments.
// Math fragments go through processMath; text fragments go through
// inlineMarkdown. This keeps LaTeX backslashes raw for KaTeX while still
// escaping HTML in prose.
function renderLine(src: string): string {
  const D = '$';
  const parts: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(D + D, i)) {
      const end = src.indexOf(D + D, i + 2);
      if (end === -1) { parts.push(src.slice(i)); break; }
      parts.push(src.slice(i, end + 2));
      i = end + 2;
    } else if (src[i] === D) {
      const end = src.indexOf(D, i + 1);
      if (end === -1) { parts.push(src.slice(i)); break; }
      parts.push(src.slice(i, end + 1));
      i = end + 1;
    } else if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end === -1) { parts.push(src.slice(i)); break; }
      parts.push(src.slice(i, end + 1));
      i = end + 1;
    } else if (src[i] === '\\' && LATEX_COMMAND.test(src.slice(i))) {
      const end = scanLatex(src, i);
      parts.push(src.slice(i, end));
      i = end;
    } else {
      let nextD = src.indexOf(D, i);
      let nextB = src.indexOf('`', i);
      let nextL = -1;
      for (let j = i; j < src.length; j++) {
        if (src[j] === '\\' && LATEX_COMMAND.test(src.slice(j))) { nextL = j; break; }
      }
      let next = src.length;
      if (nextD !== -1) next = Math.min(next, nextD);
      if (nextB !== -1) next = Math.min(next, nextB);
      if (nextL !== -1) next = Math.min(next, nextL);
      parts.push(src.slice(i, next));
      i = next;
    }
  }
  return parts
    .map((part) => {
      if (part.startsWith(D) || part.startsWith('`') || (part.startsWith('\\') && LATEX_COMMAND.test(part))) {
        return processMath(part);
      }
      return inlineMarkdown(part);
    })
    .join('');
}

export function renderMarkdown(src: string, _opts: RenderOptions = {}): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inQuote = false;

  const closeList = () => {
    if (listType) { html.push(`</${listType}>`); listType = null; }
  };
  const closeQuote = () => {
    if (inQuote) { html.push('</blockquote>'); inQuote = false; }
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      closeList(); closeQuote();
      const level = line.match(/^#{1,3}/)![0].length;
      html.push(`<h${level}>${renderLine(line.replace(/^#{1,3}\s/, ''))}</h${level}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      if (!inQuote) { html.push('<blockquote>'); inQuote = true; }
      html.push(renderLine(line.replace(/^>\s?/, '')));
      html.push('<br/>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      closeQuote();
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
      html.push(`<li>${renderLine(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      closeQuote();
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
      html.push(`<li>${renderLine(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }
    if (line.trim() === '') { closeList(); closeQuote(); html.push(''); continue; }
    closeList(); closeQuote();
    html.push(`<p>${renderLine(line)}</p>`);
  }
  closeList(); closeQuote();
  return html.join('\n');
}
