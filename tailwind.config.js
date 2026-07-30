/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#1A0F08',
          900: '#2A1A0E',
          850: '#3A2418',
          800: '#4A3020',
          700: '#5C3A28',
          600: '#6E4A36',
          500: '#8A5E44',
          400: '#A8765A',
          300: '#C49478',
          200: '#DDB89C',
          100: '#EFD4BE',
          50: '#F7E8D8',
        },
        cream: {
          50: '#FDFBF7',
          100: '#FAF5EC',
          200: '#F5EFE3',
          300: '#EFE6D5',
        },
        accent: {
          DEFAULT: '#0FB8A2',
          50: '#E6FFFB',
          100: '#C7FFF5',
          200: '#8CFCEC',
          300: '#4FF3DD',
          400: '#22E0C8',
          500: '#0FB8A2',
          600: '#0A8C7E',
          700: '#0B6960',
          800: '#0C4F49',
          900: '#0C3D3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['Inter', 'ui-monospace', 'monospace'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        handwritten: ['"Short Stack"', 'cursive'],
        sketch: ['"Patrick Hand"', 'cursive'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(15, 184, 162, 0.25), 0 0 24px -4px rgba(15, 184, 162, 0.35)',
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.3)',
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
