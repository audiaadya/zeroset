interface Props {
  size?: number;
  className?: string;
}

// ZeroSet logo: a "zero" ring with a center dot, in the cyan accent color.
export default function Logo({ size = 24, className = '' }: Props) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}
