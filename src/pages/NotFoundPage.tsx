import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-gray-600">Страница не найдена</p>
        <Link className="mt-4 inline-block text-rose-500 hover:text-rose-600" to="/demo-baker">
          Вернуться в конструктор
        </Link>
      </div>
    </main>
  );
}
