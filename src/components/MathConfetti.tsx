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
}

const SYMBOLS = ['∑', 'π', '√', 'Δ', '∫', '∞', 'θ', 'λ', 'φ', 'Ω', '∂', '∇', '≈', '⊕', '⊗', '∴'];
const COLORS = ['#22E0C8', '#4FF3DD', '#8CFCEC', '#C7FFF5', '#fbbf24', '#60a5fa', '#a78bfa'];

interface Props {
  trigger: number;
  originX?: number;
  originY?: number;
}

export default function MathConfetti({ trigger, originX = 50, originY = 50 }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const count = 28;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 3.5;
      newParticles.push({
        id: trigger * 1000 + i,
        char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 8,
        scale: 0.8 + Math.random() * 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.15,
      });
    }
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2800);
    return () => clearTimeout(timer);
  }, [trigger, originX, originY]);

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
            animation: `math-confetti-burst 2.6s cubic-bezier(0.2, 0.6, 0.3, 1) forwards`,
            animationDelay: `${p.delay}s`,
            ['--vx' as string]: `${p.vx}px`,
            ['--vy' as string]: `${p.vy}px`,
            ['--vr' as string]: `${p.vr}deg`,
            ['--rot' as string]: `${p.rotation}deg`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
