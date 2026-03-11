import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getConstructorMenuData, type ConstructorMenuData } from '../lib/api';

interface MenuDataContextValue {
  menuData: ConstructorMenuData;
  isMenuLoading: boolean;
  hasMenuError: boolean;
}

const EMPTY_MENU_DATA: ConstructorMenuData = {
  occasion: [],
  shape: [],
  filling: [],
  decor: [],
};

const MenuDataContext = createContext<MenuDataContextValue | undefined>(undefined);

interface MenuDataProviderProps {
  bakerId: string;
  children: React.ReactNode;
}

export function MenuDataProvider({ bakerId, children }: MenuDataProviderProps) {
  const [menuData, setMenuData] = useState<ConstructorMenuData>(EMPTY_MENU_DATA);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [hasMenuError, setHasMenuError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function prefetchMenuData() {
      setIsMenuLoading(true);
      setHasMenuError(false);

      try {
        const loadedMenuData = await getConstructorMenuData(bakerId);

        if (!isActive) {
          return;
        }

        setMenuData(loadedMenuData);
      } catch {
        if (!isActive) {
          return;
        }

        setHasMenuError(true);
        setMenuData(EMPTY_MENU_DATA);
      } finally {
        if (isActive) {
          setIsMenuLoading(false);
        }
      }
    }

    void prefetchMenuData();

    return () => {
      isActive = false;
    };
  }, [bakerId]);

  const value = useMemo<MenuDataContextValue>(
    () => ({
      menuData,
      isMenuLoading,
      hasMenuError,
    }),
    [hasMenuError, isMenuLoading, menuData],
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
