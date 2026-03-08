import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { blockDate, getBlockedDates, unblockDate } from '../../lib/api';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function buildMonthGrid(monthStart: Date): Array<Date | null> {
  const startDay = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startDay + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    return new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNumber);
  });
}

export function AdminCalendarPage() {
  const { session } = useAuthContext();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [blockedDateSet, setBlockedDateSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDate, setIsSavingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bakerId = session?.bakerId;
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(monthCursor),
    [monthCursor],
  );
  const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const loadBlockedDates = useCallback(async () => {
    if (!bakerId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rows = await getBlockedDates(bakerId);
      setBlockedDateSet(new Set(rows.map((row) => row.date)));
    } catch {
      setError('Не удалось загрузить заблокированные даты.');
    } finally {
      setIsLoading(false);
    }
  }, [bakerId]);

  useEffect(() => {
    void loadBlockedDates();
  }, [loadBlockedDates]);

  const handleToggleDate = async (dateIso: string) => {
    if (!bakerId || isSavingDate === dateIso) {
      return;
    }

    setError(null);
    setIsSavingDate(dateIso);
    const isBlocked = blockedDateSet.has(dateIso);

    setBlockedDateSet((prev) => {
      const next = new Set(prev);
      if (isBlocked) {
        next.delete(dateIso);
      } else {
        next.add(dateIso);
      }
      return next;
    });

    try {
      if (isBlocked) {
        await unblockDate(bakerId, dateIso);
      } else {
        await blockDate(bakerId, dateIso);
      }
    } catch {
      setBlockedDateSet((prev) => {
        const next = new Set(prev);
        if (isBlocked) {
          next.add(dateIso);
        } else {
          next.delete(dateIso);
        }
        return next;
      });
      setError('Не удалось обновить дату. Попробуйте ещё раз.');
    } finally {
      setIsSavingDate(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Календарь</h1>
        <p className="mt-1 text-sm text-gray-600">Нажмите на дату, чтобы заблокировать или разблокировать её.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ←
          </button>
          <p className="text-sm font-semibold capitalize text-gray-800">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-gray-500">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Загрузка календаря...</p>
        ) : (
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {monthGrid.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-12 rounded-lg bg-gray-50/70" aria-hidden="true" />;
              }

              const iso = toIsoDate(day);
              const isBlocked = blockedDateSet.has(iso);
              const isToday = iso === todayIso;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => void handleToggleDate(iso)}
                  disabled={isSavingDate === iso}
                  className={[
                    'h-12 rounded-lg border text-sm font-medium transition',
                    isBlocked
                      ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                    isToday ? 'ring-1 ring-rose-300' : '',
                    isSavingDate === iso ? 'cursor-wait opacity-70' : '',
                  ].join(' ')}
                  aria-pressed={isBlocked}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
          <span className="inline-block h-3 w-3 rounded-sm border border-red-300 bg-red-100" aria-hidden="true" />
          Заблокированная дата (недоступна в клиентском выборе даты)
        </div>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
