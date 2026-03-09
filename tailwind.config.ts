import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'rgb(var(--color-background-from-rgb, 255 245 240) / <alpha-value>)',
        blush: 'rgb(var(--color-primary-from-rgb, 244 160 176) / <alpha-value>)',
        rose: 'rgb(var(--color-primary-to-rgb, 212 89 108) / <alpha-value>)',
        chocolate: 'rgb(var(--color-text-primary-rgb, 61 44 44) / <alpha-value>)',
        truffle: 'rgb(var(--color-text-secondary-rgb, 139 112 112) / <alpha-value>)',
        vanilla: 'rgb(var(--color-surface-rgb, 255 250 250) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary-from-rgb, 244 160 176) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-primary-to-rgb, 212 89 108) / <alpha-value>)',
        },
        background: 'rgb(var(--color-background-from-rgb, 255 245 240) / <alpha-value>)',
        surface: 'rgb(var(--color-surface-rgb, 255 250 250) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--color-text-primary-rgb, 61 44 44) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb, 139 112 112) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['DM Mono', 'monospace']
      },
      boxShadow: {
        soft: '0 4px 24px rgb(var(--color-text-primary-rgb, 61 44 44) / 0.08)',
        strong: '0 8px 24px rgb(var(--color-primary-to-rgb, 212 89 108) / 0.25)',
      },
    }
  },
  plugins: []
} satisfies Config;
