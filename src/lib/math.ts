// Lightweight, safe-ish Markdown + LaTeX renderer.
// Supports: headings, bold, italic, inline code, code blocks, links,
// blockquotes, lists, and inline ($...$) / block ($$...$$) math via KaTeX.

type RenderOptions = { throwOnError?: boolean };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMath(latex: string, displayMode: boolean, opts: RenderOptions): string {
  const katex = (window as unknown as { katex?: { renderToString: (s: string, o: object) => string } }).katex;
  if (!katex) {
    return `<span class="text-accent-400 font-mono text-sm">${escapeHtml(latex)}</span>`;
  }
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: opts.throwOnError ?? false,
      output: 'html',
    });
  } catch {
    return `<span class="text-red-400 font-mono text-sm">${escapeHtml(latex)}</span>`;
  }
}

function processMath(src: string, opts: RenderOptions): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('$$', i)) {
      const end = src.indexOf('$$', i + 2);
      if (end === -1) {
        out += src.slice(i);
        break;
      }
      out += renderMath(src.slice(i + 2, end), true, opts);
      i = end + 2;
      continue;
    }
    if (src[i] === '$') {
      const end = src.indexOf('$', i + 1);
      if (end === -1) {
        out += src.slice(i);
        break;
      }
      out += renderMath(src.slice(i + 1, end), false, opts);
      i = end + 1;
      continue;
    }
    // Skip fenced code blocks so $ inside code isn't rendered as math
    if (src.startsWith('```', i)) {
      const end = src.indexOf('```', i + 3);
      if (end === -1) {
        out += src.slice(i);
        break;
      }
      const block = src.slice(i + 3, end);
      const nl = block.indexOf('\n');
      const lang = nl === -1 ? '' : block.slice(0, nl).trim();
      const code = nl === -1 ? block : block.slice(nl + 1);
      out += `<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code)}</code></pre>`;
      i = end + 3;
      continue;
    }
    // Skip inline code so $ inside isn't rendered
    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end === -1) {
        out += src.slice(i);
        break;
      }
      out += `<code>${escapeHtml(src.slice(i + 1, end))}</code>`;
      i = end + 1;
      continue;
    }
    out += src[i];
    i++;
  }
  return out;
}

function inlineMarkdown(src: string): string {
  let s = escapeHtml(src);
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Inline code already handled in processMath, but handle stray backticks
  return s;
}

export function renderMarkdown(src: string, opts: RenderOptions = {}): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inQuote = false;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (/^#{1,3}\s/.test(line)) {
      closeList();
      closeQuote();
      const level = line.match(/^#{1,3}/)![0].length;
      const text = line.replace(/^#{1,3}\s/, '');
      html.push(`<h${level}>${processMath(inlineMarkdown(text), opts)}</h${level}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(processMath(inlineMarkdown(line.replace(/^>\s?/, '')), opts));
      html.push('<br/>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      closeQuote();
      if (listType !== 'ul') {
        closeList();
        html.push('<ul>');
        listType = 'ul';
      }
      html.push(`<li>${processMath(inlineMarkdown(line.replace(/^\s*[-*]\s+/, '')), opts)}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      closeQuote();
      if (listType !== 'ol') {
        closeList();
        html.push('<ol>');
        listType = 'ol';
      }
      html.push(`<li>${processMath(inlineMarkdown(line.replace(/^\s*\d+\.\s+/, '')), opts)}</li>`);
      continue;
    }
    if (line.trim() === '') {
      closeList();
      closeQuote();
      html.push('');
      continue;
    }
    closeList();
    closeQuote();
    html.push(`<p>${processMath(inlineMarkdown(line), opts)}</p>`);
  }
  closeList();
  closeQuote();
  return html.join('\n');
}
