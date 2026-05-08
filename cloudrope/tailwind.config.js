/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F8FAFC',           // Very light blue-gray background
        surface: '#FFFFFF',      // Pure white cards
        elevated: '#F1F5F9',     // Subtle contrast for inputs/buttons
        border: '#E2E8F0',       // Soft border
        accent: '#0B7FFB',       // Vibrant Blue
        'accent-hover': '#2563EB',
        'text-primary': '#0F172A', // Deep Navy/Slate for readability
        'text-muted': '#64748B',   // Slate gray for secondary text
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        display: ['Comfortaa', 'sans-serif'],
        body: ['SN Pro', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

