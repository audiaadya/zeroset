import { useEffect, useState } from 'react';

interface Props {
  total: number;
  completed: Set<number>;
}

export default function ClimbTracker({ total, completed }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const cards = document.querySelectorAll('[data-climb-index]');
      let active = 0;
      cards.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.5) active = i;
      });
      setActiveIndex(active);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <div className="flex flex-col items-center gap-0">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink-700" />
        <div
          className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-accent-400/60 transition-all duration-500"
          style={{ height: `${(activeIndex / Math.max(total - 1, 1)) * 100}%` }}
        />
        {/* Dots */}
        <div className="relative flex flex-col items-center gap-6 py-2">
          {Array.from({ length: total }, (_, i) => {
            const isCompleted = completed.has(i);
            const isActive = i === activeIndex;
            return (
              <div key={i} className="relative flex items-center justify-center">
                <div
                  className={`climb-dot flex h-3 w-3 items-center justify-center rounded-full border ${
                    isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                  }`}
                >
                  {isCompleted && (
                    <svg className="h-2 w-2 text-ink-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {/* Label on hover */}
                <span
                  className={`absolute left-6 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity ${
                    isActive || isCompleted ? 'text-accent-300 opacity-100' : 'text-ink-500 opacity-0'
                  }`}
                >
                  {isCompleted ? 'Solved' : `Problem ${i + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
