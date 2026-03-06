/// <reference types="vite/client" />

interface TelegramWebAppThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebAppBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface TelegramWebAppHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  selectionChanged: () => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  colorScheme?: 'light' | 'dark';
  themeParams: TelegramWebAppThemeParams;
  BackButton: TelegramWebAppBackButton;
  HapticFeedback?: TelegramWebAppHapticFeedback;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
