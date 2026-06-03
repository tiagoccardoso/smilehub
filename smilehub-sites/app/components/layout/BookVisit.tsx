import Link from 'next/link'

function BookVisit() {
  return (
    <section className='premium-section px-4'>
      <div className='premium-container'>
        <div className='premium-dark rounded-[2.3rem] px-6 py-14 text-center shadow-2xl md:px-16 md:py-20'>
          <div className='premium-orb right-10 top-0 h-72 w-72 bg-[var(--premium-teal)] opacity-20'></div>
          <div className='relative z-10 mx-auto max-w-3xl'>
            <span className='premium-eyebrow text-white/70'>Agenda online</span>
            <h2 className='premium-title mt-5 text-white'>Pronto para elevar seu padrão de sorriso?</h2>
            <p className='premium-subtitle mt-6'>
              Selecione o profissional, escolha uma data disponível e envie sua solicitação de consulta em uma experiência simples e premium.
            </p>
            <div className='mt-9 flex flex-col justify-center gap-4 sm:flex-row'>
              <Link href='/agenda' className='premium-button premium-button-light'>Marcar consulta</Link>
              <Link href='/services' className='premium-button-outline border-white/20 bg-white/10 text-white hover:bg-white/20'>Ver tratamentos</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BookVisit
