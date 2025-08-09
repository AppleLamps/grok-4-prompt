/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Updated premium palette for a high-end look
        premium: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Accent color for highlights and glows
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        }
      },
      backgroundImage: {
        'aurora-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent)',
      },
      boxShadow: {
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'premium': '0 32px 64px -12px rgba(0, 0, 0, 0.15)',
        'premium-hover': '0 48px 96px -12px rgba(0, 0, 0, 0.2)',
        'button': '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
        'floating': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in': 'slideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'aurora': 'aurora 60s infinite',
        'stars': 'stars 120s linear infinite',
        'glow-line': 'glow-line 2s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(50px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%, 100% 50%, 200% 50%' },
          '33%': { backgroundPosition: '100% 50%, 200% 50%, 0% 50%' },
          '66%': { backgroundPosition: '200% 50%, 0% 50%, 100% 50%' },
          '100%': { backgroundPosition: '300% 50%, 100% 50%, 200% 50%' },
        },
        stars: {
          '0%': { transform: 'translateY(0px) rotateZ(0deg)' },
          '100%': { transform: 'translateY(-2000px) rotateZ(360deg)' },
        },
        'glow-line': {
          '0%': { opacity: '0', transform: 'translateX(0)' },
          '5%': { opacity: '1', transform: 'translateX(0)' },
          '95%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        shooting: {
          '0%': { opacity: '0', transform: 'translateX(-100px) rotateZ(45deg)' },
          '20%': { opacity: '1' },
          '40%': { opacity: '1' },
          '60%': { opacity: '0' },
          '100%': { opacity: '0', transform: 'translateX(calc(100vw + 100px)) rotateZ(45deg)' },
        },
      },
    },
  },
  plugins: [],
};