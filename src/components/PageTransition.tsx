import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  routeKey: string;
  children: ReactNode;
}

export default function PageTransition({ routeKey, children }: Props) {
  const [displayed, setDisplayed] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'erasing' | 'writing'>('idle');

  useEffect(() => {
    if (routeKey === '') return;
    setPhase('erasing');
    const eraseTimer = setTimeout(() => {
      setDisplayed(children);
      setPhase('writing');
    }, 280);
    const writeTimer = setTimeout(() => {
      setPhase('idle');
    }, 600);
    return () => { clearTimeout(eraseTimer); clearTimeout(writeTimer); };
  }, [routeKey]);

  const className =
    phase === 'erasing' ? 'notebook-leave' :
    phase === 'writing' ? 'notebook-enter' :
    '';

  return (
    <div key={routeKey} className={className}>
      {displayed}
    </div>
  );
}
