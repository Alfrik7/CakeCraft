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
      <main className="min-h-screen bg-rose-50/50 px-4 pt-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-1/3 animate-pulse rounded bg-rose-100" aria-hidden="true" />
          <div className="mt-3 h-6 w-5/6 animate-pulse rounded bg-rose-100" aria-hidden="true" />
          <div className="mt-5 h-2 w-full animate-pulse rounded bg-rose-100" aria-hidden="true" />
          <p className="mt-5 text-sm text-gray-500">Загружаем данные кондитера...</p>
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
