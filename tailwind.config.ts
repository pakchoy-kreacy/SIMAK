import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D7A4F',
          light:   '#E8F5EE',
          dark:    '#1A5C38',
          50:      '#f0faf4',
          100:     '#E8F5EE',
          200:     '#c6e8d3',
          300:     '#91d1aa',
          400:     '#55b37c',
          500:     '#2D7A4F',
          600:     '#236040',
          700:     '#1A5C38',
          800:     '#164a2e',
          900:     '#123d26',
        },
        accent: {
          DEFAULT: '#F4A921',
          light:   '#FEF3DB',
          dark:    '#d4891a',
        },
        success:  '#27AE60',
        warning:  '#F39C12',
        danger:   '#E74C3C',
      },
      fontFamily: {
        display: ['var(--font-amiri)', 'serif'],
        body:    ['var(--font-plus-jakarta)', 'sans-serif'],
        sans:    ['var(--font-plus-jakarta)', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        card:     '0 2px 8px rgba(0,0,0,0.08)',
        elevated: '0 4px 16px rgba(45,122,79,0.12)',
        inner:    'inset 0 2px 4px rgba(0,0,0,0.06)',
      },
      animation: {
        'check-bounce': 'checkBounce 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-up':     'slideUp 0.3s ease-out',
        'fade-in':      'fadeIn 0.2s ease-out',
        'skeleton':     'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        checkBounce: {
          '0%':   { transform: 'scale(0.8)' },
          '60%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}

export default config
