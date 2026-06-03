import Link from 'next/link'

type HeroHeadersProps = {
  eyebrow?: string
  title?: string
  description?: string
}

function HeroHeaders({
  eyebrow = 'SmileHub',
  title = 'Construindo relacionamentos duradouros por meio de experiências positivas',
  description = 'Uma presença digital premium para apresentar a clínica, destacar serviços e facilitar o agendamento online.',
}: HeroHeadersProps) {
  return (
    <div className='premium-container py-24'>
      <div className='max-w-4xl'>
        <span className='premium-eyebrow'>{eyebrow}</span>
        <h1 className='premium-display mt-6 max-w-5xl'>{title}</h1>
        <p className='premium-subtitle mt-6 max-w-2xl'>{description}</p>
        <div className='mt-9 flex flex-col gap-3 sm:flex-row'>
          <Link href='/agenda' className='premium-button'>Agendar online</Link>
          <Link href='/services' className='premium-button-outline'>Ver serviços</Link>
        </div>
      </div>
    </div>
  )
}

export default HeroHeaders
