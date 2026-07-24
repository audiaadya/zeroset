import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  scale: number;
  color: string;
  delay: number;
  corner: 'bl' | 'br';
}

const SYMBOLS = ['∑', 'π', '√', 'Δ', '∫', '∞', 'θ', 'λ', 'φ', 'Ω', '∂', '∇', '≈', '∴', '✓'];
const COLORS = ['#22E0C8', '#4FF3DD', '#8CFCEC', '#fbbf24', '#60a5fa', '#34d399'];

interface Props {
  trigger: number;
}

export default function CornerConfetti({ trigger }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const count = 20;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const corner = i < count / 2 ? 'bl' : 'br';
      const angle = corner === 'bl'
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6
        : -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 3 + Math.random() * 4;
      newParticles.push({
        id: trigger * 1000 + i,
        char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        x: corner === 'bl' ? 0 : 100,
        y: 100,
        vx: Math.cos(angle) * speed * (corner === 'br' ? -1 : 1),
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        scale: 0.8 + Math.random() * 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.1,
        corner,
      });
    }
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute font-serif font-bold select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            color: p.color,
            fontSize: `${p.scale}rem`,
            textShadow: `0 0 12px ${p.color}80, 0 0 24px ${p.color}40`,
            animation: `confetti-corner-up 2.4s cubic-bezier(0.15, 0.6, 0.3, 1) forwards`,
            animationDelay: `${p.delay}s`,
            ['--cx' as string]: `${p.vx * 30}px`,
            ['--cy' as string]: `${p.vy * 30}px`,
            ['--crot' as string]: `${p.rotation + p.vr * 30}deg`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
