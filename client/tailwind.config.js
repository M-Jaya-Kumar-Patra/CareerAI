/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
      },
      boxShadow: { soft: 'var(--shadow-soft)' },
    },
  },
  plugins: [],
};
