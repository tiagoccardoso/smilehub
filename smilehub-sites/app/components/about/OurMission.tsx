import about2 from '@/public/about2.webp'
import { getSiteContent } from '@/lib/siteContent'
import { resolveClinicByHost } from '@/lib/publicClinic'

const values = [
  'Diagnóstico claro e comunicação transparente',
  'Ambiente acolhedor com experiência premium',
  'Cuidado preventivo, estético e restaurador',
]

async function OurMission() {
  const clinic = await resolveClinicByHost()
  const content = await getSiteContent(clinic?.id)
  const about = content.about
  const image = about.image_url || about2.src

  return (
    <section className='premium-section' id='mission'>
      <div className='premium-container grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center'>
        <div className='premium-image-panel aspect-[5/4]'>
          <img src={image} alt='Imagem institucional da clínica' />
        </div>

        <div>
          <span className='premium-eyebrow'>Nossa essência</span>
          <h2 className='premium-title mt-5'>{about.title}</h2>
          {about.subtitle && <p className='mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-900'>{about.subtitle}</p>}
          <p className='premium-subtitle mt-5 whitespace-pre-line'>{about.body}</p>

          <div className='mt-8 grid gap-4'>
            {values.map((value) => (
              <div key={value} className='glass-card flex items-center gap-4 rounded-2xl p-4'>
                <span className='premium-icon h-11 w-11 shrink-0'>✓</span>
                <span className='font-semibold text-slate-800'>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurMission
