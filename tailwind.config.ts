import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          from: '#F8A4B8',
          to: '#E8677C'
        },
        secondary: '#FFF5F0',
        background: '#FFF0F3',
        surface: '#FFFAFA',
        accent: '#FF6B81',
        text: {
          primary: '#3D2C2C',
          secondary: '#9B8A8A'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Playfair Display', 'serif']
      },
      boxShadow: {
        card: '0 8px 32px rgba(232, 103, 124, 0.1)',
        'card-hover': '0 12px 40px rgba(232, 103, 124, 0.18)',
        float: '0 20px 60px rgba(0, 0, 0, 0.08)'
      },
      borderRadius: {
        card: '1rem'
      }
    }
  },
  plugins: []
} satisfies Config;
