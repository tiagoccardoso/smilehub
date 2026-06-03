export function FormFeedback({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  return (
    <p className={`rounded border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
      {error || ok}
    </p>
  )
}
