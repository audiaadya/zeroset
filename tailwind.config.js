/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Remapped for cream + cyan light theme.
        // ink-50/100 carry the foreground text (cyan titles, black body);
        // ink-900/950 carry the cream backgrounds.
        ink: {
          950: '#2A2418', // dark warm brown — used for modal backdrops/overlays
          900: '#F5F0E1', // cream page background
          850: '#EFE9D4', // card surface
          800: '#E8E0C8', // raised card surface
          700: '#D4C9A8', // hairline borders
          600: '#BFB48C', // emphasized borders
          500: '#8A7D55', // muted icons
          400: '#6B5E3D', // secondary text
          300: '#4A4128', // tertiary text
          200: '#2E2818', // dark text
          100: '#1A1610', // body text (near-black, warm)
          50:  '#0A8C7E', // titles (cyan, readable on cream)
        },
        accent: {
          DEFAULT: '#0A8C7E',
          50: '#E0F5F0',
          100: '#B8E8DF',
          200: '#0B6960', // dark cyan — links / highlighted text on cream
          300: '#0A8C7E', // cyan — readable text / icons on cream
          400: '#0FB8A2', // medium cyan — borders / button accents
          500: '#0A8C7E',
          600: '#0B6960',
          700: '#0C4F49',
          800: '#0C3D3A',
          900: '#082E2B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['Inter', 'ui-monospace', 'monospace'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(10, 140, 126, 0.30), 0 0 24px -4px rgba(10, 140, 126, 0.35)',
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(42,36,24,0.25)',
        deep: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 40px 80px -40px rgba(42,36,24,0.30), 0 0 0 1px rgba(10,140,126,0.06)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'ink-bleed': {
          '0%': { filter: 'blur(8px) opacity(0)', transform: 'scale(0.98)' },
          '50%': { filter: 'blur(3px) opacity(0.6)', transform: 'scale(1.0)' },
          '100%': { filter: 'blur(0) opacity(1)', transform: 'scale(1)' },
        },
        'dust': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.3' },
          '50%': { transform: 'translateY(-2px) rotate(1deg)', opacity: '0.6' },
        },
        'graph-shift': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 40px' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'ink-bleed': 'ink-bleed 0.8s ease-out both',
        'dust': 'dust 3s ease-in-out infinite',
        'graph-shift': 'graph-shift 8s linear infinite',
      },
    },
  },
  plugins: [],
};
