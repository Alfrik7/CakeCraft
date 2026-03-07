import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConstructorLayout } from '../components/ConstructorLayout';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { SkeletonPriceBar } from '../components/SkeletonPriceBar';
import { SkeletonProgressBar } from '../components/SkeletonProgressBar';
import { MenuDataProvider } from '../context/MenuDataContext';
import { OrderProvider } from '../context/OrderContext';
import { getBaker, getConstructorMenuData, type ConstructorMenuData } from '../lib/api';
import type { Baker } from '../types';
import { NotFoundPage } from './NotFoundPage';

export function ConstructorPage() {
  const { slug } = useParams();
  const [baker, setBaker] = useState<Baker | null>(null);
  const [menuData, setMenuData] = useState<ConstructorMenuData>({ shape: [], filling: [], decor: [] });
  const [hasMenuError, setHasMenuError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadBaker() {
      if (!slug) {
        setIsNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setIsNotFound(false);

      try {
        const loadedBaker = await getBaker(slug);

        if (!isActive) {
          return;
        }

        if (!loadedBaker) {
          setIsNotFound(true);
          setBaker(null);
          return;
        }

        let loadedMenuData: ConstructorMenuData = { shape: [], filling: [], decor: [] };
        let menuError = false;

        try {
          loadedMenuData = await getConstructorMenuData(loadedBaker.id);
        } catch {
          menuError = true;
        }

        if (!isActive) {
          return;
        }

        setBaker(loadedBaker);
        setMenuData(loadedMenuData);
        setHasMenuError(menuError);
      } catch {
        if (isActive) {
          setIsNotFound(true);
          setBaker(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadBaker();

    return () => {
      isActive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-x-clip bg-[var(--gradient-primary-soft)] px-3 pt-4 sm:px-4 sm:pt-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-primary-from/10 blur-3xl" />
          <span className="absolute -right-12 top-56 h-56 w-56 rounded-full bg-primary-to/10 blur-3xl" />
        </div>
        <div className="relative mx-auto flex w-full max-w-[480px] flex-col gap-4">
          <div className="sticky top-0 z-30 -mx-3 bg-surface/55 px-3 pb-3 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-xl sm:-mx-4 sm:px-4 sm:pt-4">
            <SkeletonProgressBar />
          </div>
          <div className="rounded-[2rem] bg-surface/90 p-5 shadow-card backdrop-blur-sm">
            <div className="skeleton-shimmer h-4 w-1/3 rounded-full" aria-hidden="true" />
            <div className="skeleton-shimmer mt-3 h-6 w-5/6 rounded-full" aria-hidden="true" />
            <div className="skeleton-shimmer mt-5 h-2 w-full rounded-full" aria-hidden="true" />
            <p className="mt-5 text-sm text-text-secondary">Загружаем данные кондитера...</p>
            <div className="mt-5">
              <SkeletonMenuGrid />
            </div>
          </div>
        </div>
        <SkeletonPriceBar />
      </main>
    );
  }

  if (isNotFound || !baker) {
    return <NotFoundPage />;
  }

  return (
    <OrderProvider bakerId={baker.id}>
      <MenuDataProvider menuData={menuData} hasMenuError={hasMenuError}>
        <ConstructorLayout baker={baker} />
      </MenuDataProvider>
    </OrderProvider>
  );
}
