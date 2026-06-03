import Link from 'next/link'
import Science from '../Icons/Science'
import RoundGraphic from '../Icons/RoundGraphic'
import Checkmark from '../Icons/Checkmark'
import Comfort from '../Icons/Comfort'
import Confidence from '../Icons/Confidence'

function Yep() {
  return (
    <section className='bg-[#276981] w-full h-vh '>
      <div className='flex flex-col mx-auto items-center my-48 max-w-xl px-4'>
        <h3 className='text-white text-5xl font-bold text-center'>
          Sinta-se incrível <br /> com a sua saúde bucal
        </h3>
        <div className=' relative mt-16 flex flex-row  gap-4 max-w-md w-full p-2'>
          <div className='absolute -left-[60%] hidden md:block'>
            <RoundGraphic />
          </div>
          <Checkmark />
          <div className='flex flex-col'>
            <h4 className='text-white text-2xl font-bold'>QUALIDADE</h4>
            <p className='text-md  text-white'>
              Especialistas guiados pela ciência
            </p>
          </div>
        </div>
        <div className='mt-8 flex flex-row  gap-4 max-w-md w-full p-2'>
          <Comfort />
          <div className='flex flex-col'>
            <h4 className='text-white text-2xl font-bold'>CONFORTO</h4>
            <p className='text-md text-white'>
              Atendimento relaxante em um ambiente tranquilo
            </p>
          </div>
        </div>
        <div className='mt-8 flex flex-row  gap-4 max-w-md w-full p-2'>
          <Science />
          <div className='flex flex-col'>
            <h4 className='text-white text-2xl font-bold'>TECNOLOGIA</h4>
            <p className='text-md text-white'>
              As ferramentas mais recentes para uma experiência moderna
            </p>
          </div>
        </div>
        <div className='mt-8 flex flex-row  gap-4 max-w-md w-full p-2'>
          <Confidence />
          <div className='flex flex-col'>
            <h4 className='text-white text-2xl font-bold'>CONFIANÇA</h4>
            <p className='text-md text-white'>Sorria com mais brilho do que nunca</p>
          </div>
        </div>
        <Link
          href='/about#mission'
          aria-label='Saiba mais sobre nossa missão e valores'
          className='mx-auto mt-16 inline-block rounded-md bg-blue-800 hover:bg-blue-600 px-8 py-4 text-center font-semibold text-white'>
          <span aria-hidden='true'>Saiba mais</span>
          <span className='sr-only'>Sobre nossa missão</span>
        </Link>
      </div>
    </section>
  )
}
export default Yep
