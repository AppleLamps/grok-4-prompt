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
        primary: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#1a1a1a',
        },
        gray: {
          750: '#374151',
          850: '#1f2937',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'subtle-pattern': `
          radial-gradient(circle at 20% 80%, rgba(120, 120, 120, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(120, 120, 120, 0.02) 0%, transparent 50%)
        `,
      },
      boxShadow: {
        'premium': '0 32px 64px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.04)',
        'premium-hover': '0 40px 80px rgba(0, 0, 0, 0.12), 0 20px 40px rgba(0, 0, 0, 0.06)',
        'input': '0 4px 6px rgba(0, 0, 0, 0.02), inset 0 2px 4px rgba(0, 0, 0, 0.02)',
        'input-focus': '0 8px 25px rgba(0, 0, 0, 0.08), 0 0 0 4px rgba(73, 80, 87, 0.1)',
        'button': '0 8px 16px rgba(73, 80, 87, 0.2), 0 4px 8px rgba(73, 80, 87, 0.1)',
        'button-hover': '0 12px 24px rgba(73, 80, 87, 0.25), 0 6px 12px rgba(73, 80, 87, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up-delay-1': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both',
        'fade-in-up-delay-2': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both',
        'fade-in-up-delay-3': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both',
        'shimmer': 'shimmer 0.5s ease-in-out',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      },
    },
  },
  plugins: [],
};