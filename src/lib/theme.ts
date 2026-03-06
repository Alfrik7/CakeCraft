import type { BakerTheme } from '../types';

interface ThemeColors {
  primaryFrom: string;
  primaryTo: string;
  backgroundFrom: string;
  backgroundTo: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}

export interface BakerThemePreset {
  id: BakerTheme;
  label: string;
  colors: ThemeColors;
}

const THEME_PRESETS: Record<BakerTheme, BakerThemePreset> = {
  pink: {
    id: 'pink',
    label: 'Розовая нежность',
    colors: {
      primaryFrom: '#F8A4B8',
      primaryTo: '#E8677C',
      backgroundFrom: '#FFF5F0',
      backgroundTo: '#FFE8EC',
      surface: '#FFFAFA',
      textPrimary: '#3D2C2C',
      textSecondary: '#9B8A8A',
      accent: '#FF6B81',
    },
  },
  chocolate: {
    id: 'chocolate',
    label: 'Шоколадная',
    colors: {
      primaryFrom: '#8B4513',
      primaryTo: '#D2691E',
      backgroundFrom: '#FFF8DC',
      backgroundTo: '#FBECCB',
      surface: '#FFFCF1',
      textPrimary: '#3E2723',
      textSecondary: '#7D5A44',
      accent: '#A0522D',
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Минимализм',
    colors: {
      primaryFrom: '#000000',
      primaryTo: '#333333',
      backgroundFrom: '#F5F5F5',
      backgroundTo: '#FFFFFF',
      surface: '#FFFFFF',
      textPrimary: '#111111',
      textSecondary: '#555555',
      accent: '#000000',
    },
  },
  lavender: {
    id: 'lavender',
    label: 'Лаванда',
    colors: {
      primaryFrom: '#9B59B6',
      primaryTo: '#B57EDC',
      backgroundFrom: '#F5F0FF',
      backgroundTo: '#E8D5F5',
      surface: '#FAF6FF',
      textPrimary: '#3F2A4D',
      textSecondary: '#7A638B',
      accent: '#8E44AD',
    },
  },
  mint: {
    id: 'mint',
    label: 'Мятная свежесть',
    colors: {
      primaryFrom: '#2ECC71',
      primaryTo: '#27AE60',
      backgroundFrom: '#F0FFF0',
      backgroundTo: '#D5F5E3',
      surface: '#F8FFFA',
      textPrimary: '#1F3D2D',
      textSecondary: '#4C7A63',
      accent: '#16A085',
    },
  },
};

export const BAKER_THEMES = Object.values(THEME_PRESETS);

function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized;

  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `${r} ${g} ${b}`;
}

function buildSelectChevron(color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'><path d='M6 8.25L10 12.25L14 8.25' stroke='${color}' stroke-width='1.8' stroke-linecap='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function getThemePreset(theme: BakerTheme): BakerThemePreset {
  return THEME_PRESETS[theme] ?? THEME_PRESETS.pink;
}

export function applyBakerTheme(theme: BakerTheme, root: HTMLElement = document.documentElement): void {
  const preset = getThemePreset(theme);
  const { colors } = preset;

  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${colors.primaryFrom} 0%, ${colors.primaryTo} 100%)`);
  root.style.setProperty('--gradient-primary-soft', `linear-gradient(180deg, ${colors.backgroundFrom} 0%, ${colors.backgroundTo} 100%)`);
  root.style.setProperty('--gradient-surface', `linear-gradient(180deg, ${colors.surface} 0%, ${colors.backgroundFrom} 100%)`);
  root.style.setProperty('--color-primary-from', colors.primaryFrom);
  root.style.setProperty('--color-primary-to', colors.primaryTo);
  root.style.setProperty('--color-background-from', colors.backgroundFrom);
  root.style.setProperty('--color-background-to', colors.backgroundTo);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-primary-from-rgb', hexToRgbChannels(colors.primaryFrom));
  root.style.setProperty('--color-primary-to-rgb', hexToRgbChannels(colors.primaryTo));
  root.style.setProperty('--color-background-from-rgb', hexToRgbChannels(colors.backgroundFrom));
  root.style.setProperty('--color-surface-rgb', hexToRgbChannels(colors.surface));
  root.style.setProperty('--color-text-primary-rgb', hexToRgbChannels(colors.textPrimary));
  root.style.setProperty('--color-text-secondary-rgb', hexToRgbChannels(colors.textSecondary));
  root.style.setProperty('--color-accent-rgb', hexToRgbChannels(colors.accent));
  root.style.setProperty('--select-chevron', buildSelectChevron(colors.primaryTo));
}
