/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        forest: {
          DEFAULT: '#1a3a2a',
          mid: '#2d5a42',
          light: '#3d7a58',
          muted: '#4a8a65',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8d5a0',
          dark: '#a8862e',
        },
        ivory: {
          DEFAULT: '#f7f5f0',
          dark: '#ede9e0',
          deeper: '#e0dbd0',
        },
        // Status
        success: '#16a34a',
        error: '#dc2626',
        warning: '#d97706',
        // Neutral
        ink: '#0f1a13',
        mist: '#8a9e90',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 4px 0 rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.06)',
        'card-hover': '0 4px 16px 0 rgba(26,58,42,0.12), 0 0 0 1px rgba(26,58,42,0.08)',
        'modal': '0 20px 60px 0 rgba(15,26,19,0.24)',
        'glow-gold': '0 0 20px rgba(201,168,76,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}
