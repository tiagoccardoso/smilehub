import { notFound } from 'next/navigation'
import { resolveClinicByHost } from '@/lib/publicClinic'
import { Metadata } from 'next'
import BookingForm from '../components/booking/BookingForm'

export const metadata: Metadata = {
  title: 'Agendar agora',
}

async function Booking() {
  const clinic = await resolveClinicByHost()
  if (!clinic) notFound()
  return <BookingForm />
}
export default Booking
