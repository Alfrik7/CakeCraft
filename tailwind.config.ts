import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          from: 'rgb(var(--color-primary-from-rgb) / <alpha-value>)',
          to: 'rgb(var(--color-primary-to-rgb) / <alpha-value>)'
        },
        secondary: 'rgb(var(--color-background-from-rgb) / <alpha-value>)',
        background: 'rgb(var(--color-background-from-rgb) / <alpha-value>)',
        surface: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Playfair Display', 'serif']
      },
      boxShadow: {
        card: '0 8px 32px rgba(var(--color-primary-to-rgb), 0.14)',
        'card-hover': '0 12px 40px rgba(var(--color-primary-to-rgb), 0.2)',
        float: '0 20px 60px rgba(var(--color-text-primary-rgb), 0.16)'
      },
      borderRadius: {
        card: '1rem'
      }
    }
  },
  plugins: []
} satisfies Config;
