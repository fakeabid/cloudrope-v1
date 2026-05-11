/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:             '#EBEBEB',
        surface:        '#FFFFFF',
        elevated:       '#F5F5F5',
        border:         '#E5E7EB',
        accent:         '#2563EB',
        'accent-hover': '#1D4ED8',
        'accent-light': '#EFF6FF',
        'text-primary': '#111827',
        'text-muted':   '#9CA3AF',
        success:        '#22C55E',
        error:          '#EF4444',
        warning:        '#F59E0B',
      },
      fontFamily: {
        display: ['Comfortaa', 'sans-serif'],
        body:    ['SN Pro', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'fade-up':    'fadeUp 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
