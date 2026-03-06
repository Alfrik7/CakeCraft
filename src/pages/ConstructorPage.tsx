import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConstructorLayout } from '../components/ConstructorLayout';
import { OrderProvider } from '../context/OrderContext';
import { getBaker } from '../lib/api';
import type { Baker } from '../types';
import { NotFoundPage } from './NotFoundPage';

export function ConstructorPage() {
  const { slug } = useParams();
  const [baker, setBaker] = useState<Baker | null>(null);
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

        setBaker(loadedBaker);
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
        <div className="relative mx-auto max-w-[480px] rounded-[2rem] bg-surface/90 p-5 shadow-card backdrop-blur-sm">
          <div className="h-4 w-1/3 animate-pulse rounded-full bg-primary-from/20" aria-hidden="true" />
          <div className="mt-3 h-6 w-5/6 animate-pulse rounded-full bg-primary-from/20" aria-hidden="true" />
          <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-primary-from/20" aria-hidden="true" />
          <p className="mt-5 text-sm text-text-secondary">Загружаем данные кондитера...</p>
        </div>
      </main>
    );
  }

  if (isNotFound || !baker) {
    return <NotFoundPage />;
  }

  return (
    <OrderProvider bakerId={baker.id}>
      <ConstructorLayout baker={baker} />
    </OrderProvider>
  );
}
