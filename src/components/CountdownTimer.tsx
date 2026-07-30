import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

interface Props {
  target: string;
  label?: string;
  compact?: boolean;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function CountdownTimer({ target, label = 'Answers unlock in', compact = false }: Props) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const lastMinute = useRef(-1);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = totalSeconds > 0 && totalSeconds <= 60;

  useEffect(() => {
    if (minutes !== lastMinute.current) {
      lastMinute.current = minutes;
      setPulseKey((k) => k + 1);
    }
  }, [minutes]);

  const cells = [
    { v: days, l: 'days' },
    { v: hours, l: 'hrs' },
    { v: minutes, l: 'min' },
    { v: seconds, l: 'sec' },
  ];

  if (!mounted) {
    return <div className="h-16" aria-hidden />;
  }

  if (remaining === 0) {
    return (
      <div
        className={`inline-flex items-center gap-2 border-2 border-accent-500 bg-accent-500/10 px-3 py-1.5 font-handwritten text-sm font-bold text-accent-700 ${compact ? '' : 'text-base'}`}
        style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
      >
        <Lock className="h-3.5 w-3.5" />
        Answers unlocked
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'sketch-border-sm bg-cream-100 p-4'}>
      {!compact && (
        <div className="mb-3 flex items-center gap-2 font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">
          <Lock className="h-3.5 w-3.5 text-accent-600" />
          {label}
        </div>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        {cells.map((c, i) => (
          <div key={c.l} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <div
                key={c.l === 'min' ? `min-${pulseKey}` : c.l}
                className={`min-w-[2.75rem] border-2 border-ink-600 bg-white px-2 py-1.5 text-center font-mono font-semibold tabular-nums text-ink-950 sm:min-w-[3.25rem] sm:px-3 sm:py-2 ${
                  compact ? 'text-base' : 'text-xl sm:text-2xl'
                } ${isUrgent && c.l === 'sec' ? 'timer-pulse-urgent border-amber-500/50' : c.l === 'min' ? 'timer-pulse' : ''}`}
                style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}
              >
                {pad(c.v)}
              </div>
              <div className="mt-1 font-handwritten text-[10px] font-bold uppercase tracking-wider text-ink-600">{c.l}</div>
            </div>
            {i < cells.length - 1 && (
              <span className="font-mono text-lg text-ink-500 sm:text-xl" aria-hidden>
                :
              </span>
            )}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="mt-3 font-handwritten text-xs text-ink-600">
          Reveals at {new Date(target).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}
    </div>
  );
}
