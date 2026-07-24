import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface SpringButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
}

const spring = { type: 'spring', stiffness: 320, damping: 18, mass: 0.7 } as const;

export function SpringButton({
  children,
  variant = 'solid',
  className = '',
  ...rest
}: SpringButtonProps) {
  const base =
    variant === 'solid'
      ? 'border border-accent-400 bg-accent-400/15 text-accent-200'
      : 'border border-ink-700 text-ink-200';
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.03, rotate: -0.5 }}
      whileTap={{ scale: 0.96, y: 1 }}
      transition={spring}
      className={`focus-ring relative overflow-hidden rounded-md px-4 py-2 text-sm font-semibold ${base} ${className}`}
      {...rest}
    >
      <motion.span
        className="pointer-events-none absolute inset-0 origin-left"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        style={{ background: 'linear-gradient(90deg, rgba(10,140,126,0.18), rgba(10,140,126,0.05))' }}
      />
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
}

interface SpringCardProps {
  children: ReactNode;
  className?: string;
  lift?: number;
}

export function SpringCard({ children, className = '', lift = 4 }: SpringCardProps) {
  return (
    <motion.div
      whileHover={{ y: -lift, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
      className={`group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850/50 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export const springTransition = spring;
