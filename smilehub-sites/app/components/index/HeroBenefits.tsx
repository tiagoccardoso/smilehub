import Link from 'next/link'

const benefits = [
  {
    title: 'Qualidade clínica',
    text: 'Protocolos organizados para consultas preventivas, restauradoras e estéticas com foco em segurança.',
    icon: '◇',
  },
  {
    title: 'Conforto premium',
    text: 'Uma experiência mais tranquila, com comunicação clara antes, durante e depois do atendimento.',
    icon: '◌',
  },
  {
    title: 'Tecnologia aplicada',
    text: 'Fluxos digitais que valorizam agendamento, histórico, organização e acompanhamento do paciente.',
    icon: '✦',
  },
  {
    title: 'Confiança no sorriso',
    text: 'Tratamentos explicados de forma simples para que cada paciente entenda o próximo passo.',
    icon: '✓',
  },
]

function HeroBenefits() {
  return (
    <section className='premium-section premium-dark'>
      <div className='premium-orb right-0 top-0 h-80 w-80 bg-[var(--premium-teal)] opacity-20'></div>
      <div className='premium-container relative z-10 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center'>
        <div>
          <span className='premium-eyebrow text-white/70'>Experiência odontológica</span>
          <h2 className='premium-title mt-5 text-white'>Sinta-se incrível com a sua saúde bucal.</h2>
          <p className='premium-subtitle mt-6'>
            Um site com linguagem visual sofisticada, interação leve e foco em conversão para transformar visitantes em pacientes agendados.
          </p>
          <Link href='/about#mission' className='premium-button premium-button-light mt-8'>Saiba mais</Link>
        </div>

        <div className='grid gap-5 sm:grid-cols-2'>
          {benefits.map((benefit) => (
            <article key={benefit.title} className='glass-card rounded-3xl border-white/20 bg-white/10 p-7 premium-card-hover'>
              <span className='premium-icon'>{benefit.icon}</span>
              <h3 className='mt-6 text-2xl font-bold text-white'>{benefit.title}</h3>
              <p className='mt-4 text-sm leading-6 text-white/70'>{benefit.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroBenefits
