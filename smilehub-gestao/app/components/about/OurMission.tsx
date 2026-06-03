import about2 from '@/public/about2.webp'
import Image from 'next/image'
import { getSiteContent } from '@/lib/siteContent'
import { resolveClinicByHost } from '@/lib/publicClinic'

async function OurMission() {
  const clinic = await resolveClinicByHost()
  const content = await getSiteContent(clinic?.id)
  const about = content.about
  return (
    <section className='my-16' id='mission'>
      <div className='mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-12 lg:py-16'>
        <h2 className='mb-8 text-3xl font-bold md:text-5xl lg:mb-14'>{about.title}</h2>
        <p className='mb-8 text-sm text-slate-800 sm:text-base lg:mb-24'>{about.body}</p>
        <div className='grid gap-10 lg:grid-cols-2 lg:gap-12'>
          <Image height={1000} width={1000} src={about.image_url || about2} alt='imagem institucional da clínica' className='object-contain rounded' />
          <div className='flex flex-col gap-5 rounded-2xl border border-solid border-black p-10 sm:p-20'>
            <h2 className='text-3xl font-bold md:text-5xl'>{about.subtitle || 'Nossa missão'}</h2>
            <p className='text-sm text-slate-800 sm:text-base'>{about.body}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
export default OurMission
