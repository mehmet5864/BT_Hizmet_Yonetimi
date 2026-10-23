/** Sayfa geçişlerinde iskelet gösterir (yükleme hissini yumuşatır). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-8" aria-busy="true" aria-label="Yükleniyor">
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  );
}
