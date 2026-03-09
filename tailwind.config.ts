import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        blush: '#F4A0B0',
        rose: '#D4596C',
        chocolate: '#3D2C2C',
        truffle: '#8B7070',
        vanilla: '#FFFAFA',
        gold: '#C8956C',
        primary: {
          DEFAULT: '#F4A0B0',
        },
        accent: {
          DEFAULT: '#D4596C',
        },
        background: '#FFF8F0',
        surface: '#FFFAFA',
        text: {
          primary: '#3D2C2C',
          secondary: '#8B7070'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['DM Mono', 'monospace', 'Playfair Display', 'serif']
      },
      boxShadow: {
        soft: '0 4px 24px rgba(61, 44, 44, 0.06)',
        strong: '0 8px 24px rgba(212, 89, 108, 0.25)',
      },
      backgroundImage: {
        'gradient-rose': 'linear-gradient(135deg, #F4A0B0, #D4596C)',
        'gradient-warm': 'linear-gradient(180deg, #FFF8F0 0%, #FFE8EC 50%, #FFF5F0 100%)',
      }
    }
  },
  plugins: []
} satisfies Config;