import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

interface LocationState {
  from?: string;
}

export function AdminLoginPage() {
  const { session, loginBySlug } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/admin/menu" replace />;
  }

  const state = location.state as LocationState | null;
  const redirectTo = state?.from && state.from.startsWith('/admin') ? state.from : '/admin/menu';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const success = await loginBySlug(slug);

      if (!success) {
        setError('Кондитер с таким slug не найден. Проверьте ссылку и попробуйте снова.');
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch {
      setError('Не удалось выполнить вход. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-rose-50/50 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Вход в админку</h1>
        <p className="mt-2 text-sm text-gray-600">
          Для MVP используйте секретный slug кондитера (например, <span className="font-medium">demo-baker</span>).
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Секретный slug</span>
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Введите slug"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-rose-200 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !slug.trim()}
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
          >
            {submitting ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}
