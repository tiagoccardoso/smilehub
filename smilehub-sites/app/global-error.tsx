'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error(error)

  return (
    <html lang='pt-BR'>
      <body>
        <main className='flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10'>
          <section className='w-full max-w-xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm'>
            <p className='text-sm font-semibold uppercase tracking-wide text-red-600'>Erro interno</p>
            <h1 className='mt-3 text-3xl font-bold text-slate-900'>Não foi possível carregar a página</h1>
            <p className='mt-4 text-slate-600'>
              A página existe, mas ocorreu uma falha inesperada durante o carregamento. Tente novamente ou volte para o painel.
            </p>
            {error?.digest && (
              <p className='mt-3 rounded bg-slate-100 px-3 py-2 text-xs text-slate-500'>Código: {error.digest}</p>
            )}
            <div className='mt-6 flex flex-col justify-center gap-3 sm:flex-row'>
              <button
                type='button'
                onClick={reset}
                className='rounded-md bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-800'>
                Tentar novamente
              </button>
              <a
                href='/admin/dashboard'
                className='rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100'>
                Voltar ao painel
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
