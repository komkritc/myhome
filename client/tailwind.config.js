/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.tsx",
    "./src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50, #eef4ff)',
          100: 'var(--color-brand-100, #d9e5ff)',
          200: 'var(--color-brand-200, #bcd2ff)',
          300: 'var(--color-brand-300, #8eb5ff)',
          400: 'var(--color-brand-400, #598dff)',
          500: 'var(--color-brand-500, #3366ff)',
          600: 'var(--color-brand-600, #1a44f5)',
          700: 'var(--color-brand-700, #1333e1)',
          800: 'var(--color-brand-800, #162cb6)',
          900: 'var(--color-brand-900, #182b8f)',
          950: 'var(--color-brand-950, #141c57)',
        },
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: { DEFAULT: '#16a34a', light: '#dcfce7', dark: '#15803d' },
        warning: { DEFAULT: '#d97706', light: '#fef3c7', dark: '#b45309' },
        danger: { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#b91c1c' },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'card': '0.625rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
