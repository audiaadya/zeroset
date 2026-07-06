/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#0F1422',
          800: '#141A2B',
          700: '#1C2438',
          600: '#2A3450',
          500: '#3B4666',
          400: '#5A6788',
          300: '#8A95B5',
          200: '#C2C9DE',
          100: '#E6E9F2',
          50: '#F4F6FB',
        },
        accent: {
          DEFAULT: '#22E0C8',
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
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34, 224, 200, 0.25), 0 0 24px -4px rgba(34, 224, 200, 0.35)',
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)',
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
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
