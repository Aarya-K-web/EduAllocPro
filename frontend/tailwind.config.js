/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#2563EB',
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Ink (text scale)
        ink: {
          primary:   '#0F172A',
          secondary: '#475569',
          muted:     '#94A3B8',
          inverse:   '#F8FAFC',
        },
        // Surface
        surface: {
          bg:      '#F8FAFC',
          card:    '#FFFFFF',
          sidebar: '#0A0F1E',
          overlay: 'rgba(10,15,30,0.72)',
        },
        // DI urgency tiers
        di: {
          critical: '#E11D48',
          high:     '#D97706',
          moderate: '#2563EB',
          stable:   '#059669',
        },
        // Border
        border: {
          DEFAULT: '#E2E8F0',
          strong:  '#CBD5E1',
        },
      },
      fontFamily: {
        sans:        ['Inter', 'system-ui', 'sans-serif'],
        devanagari:  ['"Noto Sans Devanagari"', 'Inter', 'sans-serif'],
        mono:        ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        glow:  '0 0 0 3px rgba(37,99,235,0.25)',
        card:  '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
        panel: '0 20px 60px rgba(15,23,42,0.18)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':     'shimmer 1.5s infinite',
        'count-up':    'countUp 1.2s ease-out forwards',
        'slide-in':    'slideIn 0.3s ease-out',
        'ring-pulse':  'ringPulse 2s ease-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        ringPulse: {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '70%':  { transform: 'scale(2.2)', opacity: '0' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      spacing: {
        sidebar: '240px',
        topbar:  '56px',
      },
      screens: {
        beo: '360px',
        xs:  '480px',
      },
      borderRadius: {
        card: '12px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
