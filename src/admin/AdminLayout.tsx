import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin/menu', label: 'Меню' },
  { to: '/admin/orders', label: 'Заказы' },
  { to: '/admin/profile', label: 'Профиль' },
] as const;

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'К';
  }

  return trimmed[0]?.toUpperCase() ?? 'К';
}

export function AdminLayout() {
  const { session, logout } = useAuthContext();
  const location = useLocation();

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-rose-50/50 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        <aside className="hidden w-60 border-r border-rose-100 bg-white px-4 py-6 md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">CakeCraft Admin</p>
          <nav className="mt-5 space-y-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-rose-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0">
          <header className="sticky top-0 z-10 border-b border-rose-100 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.bakerLogoUrl ? (
                  <img
                    src={session.bakerLogoUrl}
                    alt={`Логотип ${session.bakerName}`}
                    className="h-10 w-10 rounded-full border border-rose-100 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
                    {getAvatarFallback(session.bakerName)}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Панель кондитера</p>
                  <p className="text-sm font-semibold text-gray-900">{session.bakerName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                Выйти
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6">
            <Outlet />
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-rose-100 bg-white px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 md:hidden">
            <ul className="grid grid-cols-3 gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.to;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={`flex min-h-11 items-center justify-center rounded-xl px-2 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-rose-100 text-rose-700' : 'text-gray-600 hover:bg-rose-50'
                      }`}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
