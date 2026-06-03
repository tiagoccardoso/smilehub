import Image from 'next/image'
import doc1 from '@/public/doc1.webp'
import doc2 from '@/public/doc2.webp'
import doc3 from '@/public/doc3.webp'

const pillars = [
  {
    title: 'Atendimento humanizado',
    text: 'Cada etapa da consulta é pensada para reduzir ansiedade, explicar decisões clínicas e trazer previsibilidade ao paciente.',
    image: doc1,
  },
  {
    title: 'Equipe clínica integrada',
    text: 'O fluxo do atendimento valoriza comunicação entre recepção, profissionais e paciente para manter a jornada organizada.',
    image: doc2,
  },
  {
    title: 'Ambiente de confiança',
    text: 'Design, tecnologia e cuidado se unem para apresentar uma clínica moderna, limpa e acolhedora.',
    image: doc3,
  },
]

function OurTeamAbout() {
  return (
    <section className='premium-section bg-white'>
      <div className='premium-container'>
        <div className='mx-auto max-w-3xl text-center'>
          <span className='premium-eyebrow'>Cuidado multidisciplinar</span>
          <h2 className='premium-title mt-5'>Uma experiência pensada para pessoas.</h2>
          <p className='premium-subtitle mt-6'>
            Em vez de informações fictícias de equipe, esta seção apresenta os pilares reais que uma clínica pode personalizar nas configurações do site.
          </p>
        </div>

        <div className='mt-14 grid gap-6 lg:grid-cols-3'>
          {pillars.map((pillar) => (
            <article key={pillar.title} className='group'>
              <div className='premium-image-panel aspect-[4/3]'>
                <Image src={pillar.image} alt={pillar.title} className='h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0' />
              </div>
              <div className='glass-card mx-4 -mt-12 relative rounded-3xl p-7'>
                <h3 className='text-2xl font-bold tracking-[-0.03em] text-slate-950'>{pillar.title}</h3>
                <p className='mt-4 leading-7 text-slate-600'>{pillar.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default OurTeamAbout
