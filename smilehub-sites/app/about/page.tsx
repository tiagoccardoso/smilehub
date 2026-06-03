import { notFound } from 'next/navigation'
import { resolveClinicByHost } from '@/lib/publicClinic'
import BookVisit from '../components/layout/BookVisit'
import about from '@/public/about.webp'
import OurTeamAbout from '../components/about/OurTeamAbout'
import OurMission from '../components/about/OurMission'
import HeroContainer from '../components/layout/HeroContainer'
import { Metadata } from 'next'
import HeroHeaders from '../components/layout/HeroHeaders'

export const metadata: Metadata = {
  title: 'Sobre',
}

async function About() {
  const clinic = await resolveClinicByHost()
  if (!clinic) notFound()
  return (
    <>
      <HeroContainer backgroundImage={about.src}>
        <HeroHeaders
          eyebrow='Sobre a experiência SmileHub'
          title='Ciência, acolhimento e estética em cada detalhe.'
          description='Uma página institucional com visual premium para transmitir confiança antes mesmo do primeiro contato.'
        />
      </HeroContainer>
      <OurMission />
      <OurTeamAbout />
      <BookVisit />
    </>
  )
}

export default About
