import { getSiteContent } from '@/lib/siteContent'
import { resolveClinicByHost } from '@/lib/publicClinic'

const treatmentGroups = [
  {
    title: 'Estética e eletivos',
    text: 'Procedimentos para melhorar harmonia, brilho e naturalidade do sorriso com planejamento individualizado.',
    items: ['Facetas de porcelana', 'Clareamento dental', 'Restaurações estéticas'],
    icon: '✧',
  },
  {
    title: 'Preventiva e geral',
    text: 'Acompanhamento periódico para proteger dentes e gengivas, prevenindo problemas maiores.',
    items: ['Limpezas e exames', 'Radiografias', 'Orientações de higiene'],
    icon: '✓',
  },
  {
    title: 'Reabilitação oral',
    text: 'Soluções para recuperar função, estética e segurança ao sorrir e mastigar.',
    items: ['Implantes', 'Coroas e pontes', 'Próteses e planejamento'],
    icon: '⌬',
  },
]

async function OurServices() {
  const clinic = await resolveClinicByHost()
  const content = await getSiteContent(clinic?.id)
  const services = content.services

  return (
    <section className='premium-section bg-white' id='services'>
      <div className='premium-container'>
        <div className='mx-auto max-w-3xl text-center'>
          <span className='premium-eyebrow'>Tratamentos</span>
          <h2 className='premium-title mt-5'>{services.title}</h2>
          {services.subtitle && <p className='premium-subtitle mt-6'>{services.subtitle}</p>}
        </div>

        {services.image_url && (
          <div className='premium-image-panel mx-auto mt-12 aspect-[16/7] max-w-5xl'>
            <img src={services.image_url} alt='Imagem de serviços odontológicos' />
          </div>
        )}

        <div className='mt-14 grid gap-6 lg:grid-cols-3'>
          {treatmentGroups.map((group) => (
            <article key={group.title} className='glass-card rounded-[2rem] p-8 premium-card-hover'>
              <span className='premium-icon text-2xl'>{group.icon}</span>
              <h3 className='mt-7 text-2xl font-bold tracking-[-0.03em]'>{group.title}</h3>
              <p className='mt-4 leading-7 text-slate-600'>{group.text}</p>
              <ul className='mt-6 space-y-3'>
                {group.items.map((item) => (
                  <li key={item} className='flex items-center gap-3 text-sm font-semibold text-slate-700'>
                    <span className='h-2 w-2 rounded-full bg-[var(--premium-teal-strong)]'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className='glass-card-strong mt-8 rounded-[2rem] p-8 md:p-10'>
          <span className='premium-eyebrow'>Conteúdo configurável</span>
          <p className='premium-subtitle mt-5 whitespace-pre-line'>{services.body}</p>
        </div>
      </div>
    </section>
  )
}

export default OurServices
