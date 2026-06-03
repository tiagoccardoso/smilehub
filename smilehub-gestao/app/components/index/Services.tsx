import Link from 'next/link'

function Services() {
  return (
    <section>
      <div className='mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24 lg:py-32'>
        <div className='mx-auto w-full max-w-3xl text-center'>
          <h2 className='text-3xl font-semibold md:text-5xl'>
            Torne cada etapa <br />
            <Link
              href='/services/#services'
              className="bg-[url('https://assets.website-files.com/63904f663019b0d8edf8d57c/63915f9749aaab0572c48dae_Rectangle%2018.svg')] bg-cover bg-center bg-no-repeat px-4 text-white">
              centrada no paciente
            </Link>
          </h2>
        </div>
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:gap-12 text-balance'>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/318498/tooth-shield.svg' alt='cuidados preventivos' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Cuidados preventivos</p>
            <p>
              Nossos serviços preventivos ajudam a manter sua saúde bucal,
              evitando que doenças se instalem. Exames regulares, limpezas,
              radiografias e orientações de cuidados em casa fazem parte desse
              cuidado.
            </p>
          </div>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/382221/dental-implant-health-healthcare-medical-medicine-pharmacy.svg' alt='cuidados restauradores' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Serviços restauradores</p>
            <p>
              Nossos serviços restauradores incluem restaurações, coroas,
              pontes, implantes, tratamento de canal e próteses para devolver a
              saúde à sua boca quando surgem problemas.
            </p>
          </div>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/318582/tooth-clean.svg' alt='procedimentos estéticos' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Procedimentos estéticos</p>
            <p>
              Nossos procedimentos estéticos vão de clareamento dental a
              facetas e bonding, todos pensados para melhorar o seu sorriso.
            </p>
          </div>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/100660/braces.svg' alt='aparelho ortodôntico' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Ortodontia</p>
            <p>
              Oferecemos tratamento ortodôntico completo para pacientes de
              todas as idades, incluindo aparelhos e Invisalign.
            </p>
          </div>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/318498/tooth-shield.svg' alt='cuidados periodontais' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Cuidados periodontais</p>
            <p>
              Fazemos diagnóstico e tratamento de condições que afetam a
              gengiva e o osso que sustentam seus dentes.
            </p>
          </div>
          <div className='relative mb-8 flex flex-col rounded-2xl border border-solid border-black p-8 [box-shadow:rgb(0,_0,_0)_9px_9px] lg:mb-4'>
            <div className='absolute -top-8 bottom-auto left-auto right-4 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-solid border-[#9b9b9b] bg-white [box-shadow:rgb(0,_0,_0)_0px_5px] lg:right-8'>
              <img src='https://www.svgrepo.com/show/318572/tooth-health.svg' alt='atendimento odontológico de emergência' loading='lazy' height='32' width='32' className='relative z-10 inline-block ' />
              <div className='absolute z-0 h-8 w-8 rounded-full border border-[#c0d1ff] bg-[#c0d1ff]'></div>
            </div>
            <p className='mb-4 text-xl font-semibold'>Urgência odontológica</p>
            <p>
              Nossa clínica está preparada para atender a maioria das urgências
              odontológicas, entendendo que elas podem acontecer a qualquer
              momento.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
export default Services
