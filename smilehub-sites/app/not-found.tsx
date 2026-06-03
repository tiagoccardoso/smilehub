import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='flex min-h-[70vh] items-center justify-center px-4 py-10'>
      <section className='w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <p className='text-7xl font-bold tracking-tight text-slate-300'>404</p>
        <h1 className='mt-3 text-3xl font-bold text-slate-900'>Página não encontrada</h1>
        <p className='mt-4 text-slate-600'>
          O endereço acessado não corresponde a nenhuma página disponível no sistema.
        </p>
        <div className='mt-6 flex flex-col justify-center gap-3 sm:flex-row'>
          <Link
            href='/'
            className='rounded-md bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-800'>
            Ir para o site
          </Link>
          <Link
            href='/admin/dashboard'
            className='rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100'>
            Ir para o painel
          </Link>
        </div>
      </section>
    </main>
  )
}
