import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Use a sophisticated green palette for the brand
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        // Complementary accent palette for highlights and CTAs
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87'
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          900: '#0b1220'
        }
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.10)',
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.12)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(60% 60% at 10% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(60% 60% at 90% 0%, rgba(168,85,247,0.08), transparent 60%)',
        'conic-accent': 'conic-gradient(from 90deg at 50% 50%, #22c55e, #a855f7, #22c55e)'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        borderRotate: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' }
        }
      },
      animation: {
        fadeUp: 'fadeUp 0.35s ease-out both',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        borderRotate: 'borderRotate 4s linear infinite'
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          lg: '2rem',
          xl: '2.5rem',
          '2xl': '3rem'
        }
      }
    }
  },
  plugins: []
} satisfies Config
