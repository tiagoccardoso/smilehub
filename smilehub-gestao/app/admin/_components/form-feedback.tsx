export function FormFeedback({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
        error
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      {error || ok}
    </p>
  )
}
