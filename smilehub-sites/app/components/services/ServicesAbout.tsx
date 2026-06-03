import services2 from '@/public/services2.webp'
import Image from 'next/image'

function ServicesAbout() {
  return (
    <section className='premium-section'>
      <div className='premium-container grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center'>
        <div>
          <span className='premium-eyebrow'>Clínica premium</span>
          <h2 className='premium-title mt-5'>Apaixone-se pelo seu cuidado odontológico.</h2>
          <p className='premium-subtitle mt-6'>
            A página de serviços foi reorganizada com linguagem visual de luxo clínico, cartões em glassmorphism e áreas claras para apresentar tratamentos, benefícios e diferenciais.
          </p>
          <div className='mt-8 grid gap-4 sm:grid-cols-2'>
            <div className='glass-card rounded-3xl p-6'>
              <span className='premium-icon'>✦</span>
              <h3 className='mt-5 text-xl font-bold'>Precisão</h3>
              <p className='mt-3 text-sm leading-6 text-slate-600'>Estrutura visual que reforça tecnologia, diagnóstico e segurança.</p>
            </div>
            <div className='glass-card rounded-3xl p-6'>
              <span className='premium-icon'>◌</span>
              <h3 className='mt-5 text-xl font-bold'>Conforto</h3>
              <p className='mt-3 text-sm leading-6 text-slate-600'>Experiência leve para aproximar o paciente do agendamento.</p>
            </div>
          </div>
        </div>

        <div className='premium-image-panel aspect-[5/4]'>
          <Image src={services2} alt='Imagem de paciente sorrindo' className='h-full w-full object-cover' />
        </div>
      </div>
    </section>
  )
}

export default ServicesAbout
