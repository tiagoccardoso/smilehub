import Link from 'next/link'

const services = [
  {
    title: 'Cuidados preventivos',
    text: 'Limpezas, exames, radiografias e orientações para preservar a saúde bucal no dia a dia.',
    icon: '🦷',
  },
  {
    title: 'Odontologia estética',
    text: 'Clareamento, facetas e soluções para um sorriso harmônico, natural e confiante.',
    icon: '✧',
  },
  {
    title: 'Implantes e reabilitação',
    text: 'Planejamento para devolver função mastigatória, autoestima e qualidade de vida.',
    icon: '⌁',
  },
  {
    title: 'Ortodontia',
    text: 'Alinhamento do sorriso com acompanhamento estruturado e foco em conforto.',
    icon: '◍',
  },
  {
    title: 'Periodontia',
    text: 'Diagnóstico e tratamento de gengiva e estruturas de sustentação dos dentes.',
    icon: '⌬',
  },
  {
    title: 'Urgência odontológica',
    text: 'Atendimento para dores, traumas e situações que exigem cuidado rápido.',
    icon: '＋',
  },
]

function Services() {
  return (
    <section className='premium-section bg-white' id='services'>
      <div className='premium-container'>
        <div className='mx-auto max-w-3xl text-center'>
          <span className='premium-eyebrow'>Soluções de cuidado</span>
          <h2 className='premium-title mt-5'>Tratamentos com estética, tecnologia e confiança.</h2>
          <p className='premium-subtitle mt-6'>
            Cards com vidro, profundidade e microinterações para destacar os principais serviços da clínica sem perder clareza.
          </p>
        </div>

        <div className='mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {services.map((service) => (
            <article key={service.title} className='glass-card rounded-[2rem] p-8 premium-card-hover'>
              <span className='premium-icon text-2xl'>{service.icon}</span>
              <h3 className='mt-7 text-2xl font-bold tracking-[-0.03em] text-slate-950'>{service.title}</h3>
              <p className='mt-4 leading-7 text-slate-600'>{service.text}</p>
              <Link href='/services/#services' className='mt-7 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-slate-950'>
                Saiba mais <span aria-hidden='true'>→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
