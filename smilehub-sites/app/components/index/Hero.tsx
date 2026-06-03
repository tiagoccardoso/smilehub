import Link from 'next/link'
import hero from '@/public/hero.webp'
import { getSiteContent } from '@/lib/siteContent'
import { resolveClinicByHost } from '@/lib/publicClinic'

async function Hero() {
  const clinic = await resolveClinicByHost()
  const content = await getSiteContent(clinic?.id)
  const home = content.home
  const heroImage = home.image_url || hero.src

  return (
    <section className='hero-premium'>
      <div className='premium-orb right-[-8rem] top-14 h-72 w-72 bg-[var(--premium-teal)]'></div>
      <div className='premium-orb bottom-0 left-[-10rem] h-80 w-80 bg-[var(--premium-silver)] opacity-40'></div>

      <div className='premium-container relative z-10 grid items-center gap-12 lg:grid-cols-[1fr_0.95fr]'>
        <div>
          <span className='premium-eyebrow'>Odontologia premium e digital</span>
          <h1 className='premium-display mt-6 max-w-4xl'>
            {home.title || 'Reconecte-se com o seu sorriso'}
          </h1>
          <p className='premium-subtitle mt-7 max-w-2xl text-lg'>
            {home.subtitle || 'Uma nova abordagem para o conforto odontológico'}
          </p>
          {home.body && (
            <p className='mt-4 max-w-xl text-slate-600'>
              {home.body}
            </p>
          )}

          <div className='mt-9 flex flex-col gap-3 sm:flex-row'>
            <Link href='/agenda' className='premium-button'>Agendar online</Link>
            <Link href='/services' className='premium-button-outline'>Conhecer tratamentos</Link>
          </div>

          <div className='premium-stat-grid mt-10 max-w-2xl'>
            <div className='premium-stat'>
              <strong>3D</strong>
              <span>Experiência visual moderna</span>
            </div>
            <div className='premium-stat'>
              <strong>24h</strong>
              <span>Agendamento online disponível</span>
            </div>
            <div className='premium-stat'>
              <strong>360º</strong>
              <span>Cuidado preventivo, estético e reabilitador</span>
            </div>
          </div>
        </div>

        <div className='hero-visual-frame'>
          <div className='hero-image-card'>
            <img src={heroImage} alt='Consultório odontológico moderno' />
          </div>

          <div className='hero-floating-card top glass-card'>
            <span className='text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500'>Tecnologia</span>
            <div className='mt-3 flex items-center gap-3'>
              <span className='premium-icon h-12 w-12'>✦</span>
              <p className='text-sm font-semibold leading-5 text-slate-800'>Planejamento clínico com precisão e conforto.</p>
            </div>
          </div>

          <div className='hero-floating-card bottom glass-card-strong'>
            <span className='text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500'>SmileHub</span>
            <p className='mt-2 text-xl font-bold leading-tight text-slate-950'>Jornada do paciente mais leve, segura e digital.</p>
          </div>

          <div className='absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2'>
            <div className='hero-tooth relative'></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
