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
      <main className="grid min-h-screen place-items-center bg-rose-50/50 px-4">
        <p className="text-sm text-gray-500">Загружаем данные кондитера...</p>
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
