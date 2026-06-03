import services2 from '@/public/services2.webp'
import Image from 'next/image'

function ServicesAbout() {
  return (
    <section className='my-16'>
      <div className='mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-12 lg:py-16'>
        <div className='grid gap-10 lg:grid-cols-2 lg:gap-12'>
          <div className='flex flex-col gap-5 rounded-2xl  p-4'>
            <h2 className='text-3xl font-bold md:text-5xl'>
              Apaixone-se pelo seu cuidado odontológico geral
            </h2>
            <p className='text-sm text-slate-600 sm:text-base text-balance'>
              Estamos felizes em ser sua nova casa para uma odontologia excepcional. Visite-nos para uma limpeza, avaliação odontológica geral e um cuidado especial. Além disso, oferecemos tudo o que você precisa para se sentir e ficar bem.
            </p>
          </div>
          <Image
            height={1000}
            width={1000}
            src={services2}
            alt='imagem de paciente sorrindo'
            className='object-contain rounded'
          />
        </div>
      </div>
    </section>
  )
}
export default ServicesAbout
