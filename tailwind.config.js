/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        primary: {
          DEFAULT: '#0070f3',
          dark: '#0051af',
        },
        success: '#0070f3',
        warning: '#f5a623',
        error: '#ff0000',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'premium-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
}
