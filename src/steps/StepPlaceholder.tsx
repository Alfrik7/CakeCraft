interface StepPlaceholderProps {
  title: string;
  description: string;
}

export function StepPlaceholder({ title, description }: StepPlaceholderProps) {
  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </section>
  );
}
