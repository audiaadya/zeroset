import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '../lib/math';

interface Props {
  children: string;
  className?: string;
}

export default function MathText({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      const w = window as unknown as { katex?: unknown };
      if (w.katex) {
        setReady(true);
      } else {
        setTimeout(tryRender, 80);
      }
    };
    tryRender();
    return () => {
      cancelled = true;
    };
  }, []);

  const html = ready ? renderMarkdown(children) : '';

  return (
    <div
      ref={ref}
      className={`prose-math ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
