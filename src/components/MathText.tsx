import { useMemo } from 'react';
import { renderMarkdown } from '../lib/math';

interface Props {
  children: string;
  className?: string;
}

// Plain-text renderer: no external KaTeX dependency, so content shows up
// the instant the component mounts. Math markers ($...$ / $$...$$) are
// rendered as styled monospace spans instead of typeset LaTeX.
export default function MathText({ children, className = '' }: Props) {
  const html = useMemo(() => renderMarkdown(children), [children]);
  return (
    <div
      className={`prose-math ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
