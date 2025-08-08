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
        // Premium gray/black palette for high-end look
        premium: {
          50: '#fafafa',    // Ultra light gray
          100: '#f4f4f5',   // Very light gray
          200: '#e4e4e7',   // Light gray
          300: '#d4d4d8',   // Medium light gray
          400: '#a1a1aa',   // Medium gray
          500: '#71717a',   // Gray
          600: '#52525b',   // Dark gray
          700: '#3f3f46',   // Darker gray
          800: '#27272a',   // Very dark gray
          900: '#18181b',   // Almost black
          950: '#09090b',   // Pure black
        },
        primary: {
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
        gray: {
          750: '#374151',
          850: '#1f2937',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'premium-gradient': 'linear-gradient(135deg, #fafafa 0%, #f4f4f5 50%, #e4e4e7 100%)',
        'premium-dark-gradient': 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)',
        'subtle-pattern': `
          radial-gradient(circle at 20% 80%, rgba(24, 24, 27, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(24, 24, 27, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(39, 39, 42, 0.01) 0%, transparent 60%)
        `,
        'floating-shapes': `
          radial-gradient(ellipse 800px 400px at 0% 100%, rgba(24, 24, 27, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse 600px 300px at 100% 0%, rgba(39, 39, 42, 0.05) 0%, transparent 50%)
        `,
      },
      boxShadow: {
        // Premium shadows for high-end feel
        'premium': '0 32px 64px -12px rgba(24, 24, 27, 0.08), 0 20px 40px -8px rgba(39, 39, 42, 0.04), 0 8px 16px -4px rgba(63, 63, 70, 0.02)',
        'premium-hover': '0 48px 96px -12px rgba(24, 24, 27, 0.12), 0 32px 64px -8px rgba(39, 39, 42, 0.06), 0 16px 32px -4px rgba(63, 63, 70, 0.03)',
        'premium-xl': '0 60px 120px -12px rgba(24, 24, 27, 0.15), 0 40px 80px -8px rgba(39, 39, 42, 0.08), 0 20px 40px -4px rgba(63, 63, 70, 0.04)',
        'glass': '0 8px 32px rgba(24, 24, 27, 0.08), 0 4px 16px rgba(39, 39, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 16px 48px rgba(24, 24, 27, 0.12), 0 8px 24px rgba(39, 39, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'input': '0 4px 6px -1px rgba(24, 24, 27, 0.04), 0 2px 4px -1px rgba(39, 39, 42, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'input-focus': '0 12px 32px -4px rgba(24, 24, 27, 0.08), 0 0 0 4px rgba(82, 82, 91, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'button': '0 12px 28px -4px rgba(24, 24, 27, 0.25), 0 8px 16px -4px rgba(39, 39, 42, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'button-hover': '0 20px 40px -4px rgba(24, 24, 27, 0.35), 0 16px 24px -4px rgba(39, 39, 42, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'floating': '0 24px 48px -8px rgba(24, 24, 27, 0.18), 0 12px 24px -4px rgba(39, 39, 42, 0.08)',
      },

	      borderWidth: {
	        '3': '3px',
	      },

      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        // Premium page load animations
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up-delay-1': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both',
        'fade-in-up-delay-2': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both',
        'fade-in-up-delay-3': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both',
        'slide-in': 'slideIn 1s cubic-bezier(0.4, 0, 0.2, 1)',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        
        // Interactive animations
        'shimmer': 'shimmer 0.6s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'ripple': 'ripple 0.6s linear',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-gentle': 'bounceGentle 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        
        // Loading animations
        'spin-slow': 'spin 1.5s linear infinite',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'loading-dots': 'loadingDots 1.4s ease-in-out infinite',
        
        // Background animations
        'background-shift': 'backgroundShift 20s ease-in-out infinite',
        'gradient-xy': 'gradientXY 15s ease infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(40px) scale(0.98)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        slideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(60px) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(82, 82, 91, 0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(82, 82, 91, 0.2)' },
        },
        ripple: {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        loadingDots: {
          '0%, 20%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.5)' },
          '80%, 100%': { transform: 'scale(1)' },
        },
        backgroundShift: {
          '0%, 100%': { transform: 'translateX(0%) rotate(0deg)' },
          '33%': { transform: 'translateX(-10%) rotate(1deg)' },
          '66%': { transform: 'translateX(10%) rotate(-1deg)' },
        },
        gradientXY: {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        }
      },
    },
  },
  plugins: [],
};