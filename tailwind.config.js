/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        surface2: c('surface2'),
        border: c('border'),
        text: c('text'),
        textSec: c('textSec'),
        textMuted: c('textMuted'),
        accentTeal: c('accentTeal'),
        accentTeal2: c('accentTeal2'),
        accentPurple: c('accentPurple'),
        accentMagenta: c('accentMagenta')
      },
      fontFamily: {
        display: ['Jost', 'system-ui', 'sans-serif'],
        sans: ['Dosis', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl: '0.9rem', '2xl': '1.1rem' }
    }
  },
  plugins: []
};
