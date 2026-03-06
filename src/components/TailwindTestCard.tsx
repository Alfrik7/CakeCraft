export function TailwindTestCard() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-lg shadow-rose-100">
      <p className="text-sm font-medium text-rose-500">CakeCraft</p>
      <h1 className="mt-1 text-xl font-bold text-gray-900">Конструктор торта</h1>
      <p className="mt-2 text-sm text-gray-600">Tailwind CSS подключен и готов к работе.</p>
      <button
        type="button"
        className="mt-4 inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
      >
        Продолжить
      </button>
    </div>
  );
}
