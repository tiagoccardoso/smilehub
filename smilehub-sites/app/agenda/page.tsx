import { notFound } from 'next/navigation'
import { resolveClinicByHost } from '@/lib/publicClinic'
import { Metadata } from 'next'
import BookingForm from '../components/booking/BookingForm'

export const metadata: Metadata = {
  title: 'Agenda',
}

async function Agenda() {
  const clinic = await resolveClinicByHost()
  if (!clinic) notFound()
  return <BookingForm />
}

export default Agenda
