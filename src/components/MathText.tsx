import { useEffect, useMemo, useState } from 'react';
import { renderMarkdown } from '../lib/math';

interface Props {
  children: string;
  className?: string;
}

export default function MathText({ children, className = '' }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      const w = window as unknown as { katex?: unknown };
      if (w.katex) {
        setReady(true);
      } else {
        setTimeout(tryRender, 50);
      }
    };
    tryRender();
    return () => {
      cancelled = true;
    };
  }, []);

  const html = useMemo(() => {
    if (!ready) return '';
    return renderMarkdown(children);
  }, [children, ready]);

  if (!ready) {
    return (
      <div className={`prose-math ${className}`}>
        <span className="text-sm text-ink-400">Loading math renderer...</span>
      </div>
    );
  }

  return (
    <div
      className={`prose-math ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
