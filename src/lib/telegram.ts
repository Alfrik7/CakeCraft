function setThemeVariable(name: string, value: string | undefined): void {
  if (!value) {
    return;
  }

  document.documentElement.style.setProperty(name, value);
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp(): TelegramWebApp | null {
  const app = getTelegramWebApp();

  if (!app) {
    return null;
  }

  app.ready();
  app.expand();

  return app;
}

export function applyTelegramTheme(app: TelegramWebApp): void {
  const theme = app.themeParams;

  setThemeVariable('--tg-bg-color', theme.bg_color);
  setThemeVariable('--tg-secondary-bg-color', theme.secondary_bg_color);
  setThemeVariable('--tg-text-color', theme.text_color);
  setThemeVariable('--tg-hint-color', theme.hint_color);
  setThemeVariable('--tg-link-color', theme.link_color);
  setThemeVariable('--tg-button-color', theme.button_color);
  setThemeVariable('--tg-button-text-color', theme.button_text_color);

  document.documentElement.dataset.tgColorScheme = app.colorScheme ?? 'light';
}

export function triggerTelegramHaptic(type: 'selection' | 'success' = 'selection'): void {
  const app = getTelegramWebApp();

  if (!app?.HapticFeedback) {
    return;
  }

  if (type === 'success') {
    app.HapticFeedback.notificationOccurred('success');
    return;
  }

  app.HapticFeedback.selectionChanged();
}
