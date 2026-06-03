import { notFound } from 'next/navigation'
import { resolveClinicByHost } from '@/lib/publicClinic'
import HeroContainer from '../components/layout/HeroContainer'
import services from '@/public/services.webp'
import BookVisit from '../components/layout/BookVisit'
import ServicesAbout from '../components/services/ServicesAbout'
import OurServices from '../components/services/OurServices'
import { Metadata } from 'next'
import HeroHeaders from '../components/layout/HeroHeaders'

export const metadata: Metadata = {
  title: 'Serviços',
}

async function Services() {
  const clinic = await resolveClinicByHost()
  if (!clinic) notFound()
  return (
    <>
      <HeroContainer backgroundImage={services.src}>
        <HeroHeaders
          eyebrow='Tratamentos premium'
          title='Soluções odontológicas para transformar o sorriso.'
          description='Apresente especialidades, benefícios e conteúdos configuráveis em uma experiência visual moderna e convincente.'
        />
      </HeroContainer>
      <ServicesAbout />
      <OurServices />
      <BookVisit />
    </>
  )
}

export default Services
