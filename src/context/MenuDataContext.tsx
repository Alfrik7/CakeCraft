import { createContext, useContext, useMemo } from 'react';
import type { ConstructorMenuData } from '../lib/api';

interface MenuDataContextValue {
  menuData: ConstructorMenuData;
  hasMenuError: boolean;
}

const EMPTY_MENU_DATA: ConstructorMenuData = {
  shape: [],
  filling: [],
  decor: [],
};

const MenuDataContext = createContext<MenuDataContextValue | undefined>(undefined);

interface MenuDataProviderProps {
  menuData?: ConstructorMenuData;
  hasMenuError?: boolean;
  children: React.ReactNode;
}

export function MenuDataProvider({ menuData, hasMenuError = false, children }: MenuDataProviderProps) {
  const value = useMemo<MenuDataContextValue>(
    () => ({
      menuData: menuData ?? EMPTY_MENU_DATA,
      hasMenuError,
    }),
    [hasMenuError, menuData],
  );

  return <MenuDataContext.Provider value={value}>{children}</MenuDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMenuDataContext(): MenuDataContextValue {
  const context = useContext(MenuDataContext);

  if (!context) {
    throw new Error('useMenuDataContext must be used within a MenuDataProvider');
  }

  return context;
}
