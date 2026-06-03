import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/smilehub.webp'

function TheFooter() {
  const currentYear = new Date().getFullYear()
  return (
    <footer className='border-t border-white/70 bg-white/70 py-16 backdrop-blur-xl'>
      <div className='premium-container'>
        <div className='grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]'>
          <div>
            <Link href='/' className='flex items-center gap-3'>
              <span className='premium-logo-mark'>
                <Image src={logo} height={42} width={42} alt='Logotipo da SmileHub' className='h-10 w-10 object-contain' />
              </span>
              <span>
                <span className='block font-[var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-slate-950'>SmileHub</span>
                <span className='text-xs font-bold uppercase tracking-[0.2em] text-slate-500'>Dental Experience</span>
              </span>
            </Link>
            <p className='premium-subtitle mt-6 max-w-md'>
              Odontologia com atmosfera premium, tecnologia clínica e jornadas digitais para aproximar pacientes da clínica com mais confiança.
            </p>
          </div>

          <div>
            <h3 className='text-sm font-extrabold uppercase tracking-[0.18em] text-slate-950'>Navegação</h3>
            <div className='mt-5 flex flex-col gap-3 text-slate-600'>
              <Link href='/' className='transition hover:text-slate-950'>Início</Link>
              <Link href='/about' className='transition hover:text-slate-950'>Sobre nós</Link>
              <Link href='/services' className='transition hover:text-slate-950'>Serviços</Link>
              <Link href='/agenda' className='transition hover:text-slate-950'>Agendar online</Link>
            </div>
          </div>

          <div>
            <h3 className='text-sm font-extrabold uppercase tracking-[0.18em] text-slate-950'>Tratamentos</h3>
            <div className='mt-5 flex flex-col gap-3 text-slate-600'>
              <span>Prevenção</span>
              <span>Estética dental</span>
              <span>Implantes</span>
              <span>Ortodontia</span>
            </div>
          </div>

          <div className='glass-card rounded-3xl p-6'>
            <span className='premium-eyebrow'>Agenda digital</span>
            <h3 className='premium-title mt-4 text-[2rem]'>Pronto para sorrir melhor?</h3>
            <p className='mt-3 text-sm leading-6 text-slate-600'>Escolha um profissional, selecione um horário disponível e envie sua solicitação em poucos passos.</p>
            <Link href='/agenda' className='premium-button mt-6 w-full'>Agendar agora</Link>
          </div>
        </div>

        <div className='mt-14 flex flex-col gap-4 border-t border-slate-950/10 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between'>
          <span>© {currentYear} SmileHub. Todos os direitos reservados.</span>
          <span>Site público odontológico premium.</span>
        </div>
      </div>
    </footer>
  )
}

export default TheFooter
