import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f0ff',
          200: '#b9e4ff',
          300: '#8cd4ff',
          400: '#57bdff',
          500: '#2a9dff',
          600: '#1280ea',
          700: '#0d66c0',
          800: '#0f5599',
          900: '#12487b'
        }
      }
    }
  },
  plugins: []
} satisfies Config
