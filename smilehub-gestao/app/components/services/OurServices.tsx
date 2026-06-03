import { getSiteContent } from '@/lib/siteContent'
import { resolveClinicByHost } from '@/lib/publicClinic'

async function OurServices() {
  const clinic = await resolveClinicByHost()
  const content = await getSiteContent(clinic?.id)
  const services = content.services
  return (
    <section className='mx-auto w-full max-w-[1400px] md:py-20 lg:py-26 mt-8 px-4 md:px-0' id='services'>
      <h2 className='text-center text-3xl font-bold md:text-5xl mt-8'>{services.title}</h2>
      {services.subtitle && <p className='mx-auto mt-4 max-w-3xl text-center text-slate-700'>{services.subtitle}</p>}
      {services.image_url && <img src={services.image_url} alt='Imagem de serviços odontológicos' className='mx-auto mt-8 max-h-80 w-full max-w-4xl rounded object-cover' />}
      <div className='grid md:grid-cols-2 grid-cols-1 md:gap-8 gap-6 max-w-[1400px] w-full mx-auto md:justify-stretch my-20 text-balance'>
        <div className='bg-sky-50 p-8 border border-solid border-black rounded'>
          <h2 className='text-3xl font-bold'>Estética e eletivos</h2><hr className='w-40 my-8 border-2 border-black' />
          <p className='mt-4'>Está insatisfeito com algum aspecto do seu sorriso? A odontologia restauradora e estética pode ajudar você a conquistar o sorriso dos sonhos, aumentar sua autoestima e melhorar sua saúde geral.</p>
          <ul className='px-2'><li>Facetas de porcelana</li><li>Coroas, pontes e restaurações sobre implantes</li><li>Clareamento dental caseiro e em consultório</li></ul>
        </div>
        <div className='bg-sky-50 p-8 border border-solid border-black rounded'>
          <h2 className='text-3xl font-bold'>Preventiva e geral</h2><hr className='w-40 my-8 border-2 border-black' />
          <p className='mt-4'>A odontologia preventiva ajuda a manter seu sorriso em excelente forma enquanto evita problemas odontológicos sérios.</p>
          <ul className='px-2'><li>Limpezas e exames dentais</li><li>Radiografias panorâmicas</li><li>Tratamentos com flúor</li></ul>
        </div>
        <div className='bg-sky-50 p-8 md:col-span-2 border border-solid border-black rounded'>
          <h3 className='text-3xl font-bold'>Conteúdo configurável</h3><hr className='w-40 my-8 border-2 border-black' />
          <p className='mt-8 whitespace-pre-line'>{services.body}</p>
        </div>
      </div>
    </section>
  )
}
export default OurServices
