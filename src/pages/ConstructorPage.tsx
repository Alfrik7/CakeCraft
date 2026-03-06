import { useParams } from 'react-router-dom';
import { TailwindTestCard } from '../components/TailwindTestCard';

export function ConstructorPage() {
  const { slug } = useParams();

  return (
    <main className="min-h-screen p-4 pt-10">
      <p className="mx-auto mb-4 max-w-sm text-sm text-gray-500">Кондитер: {slug}</p>
      <TailwindTestCard />
    </main>
  );
}
