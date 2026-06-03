import { mapBooking } from '@/lib/dbMappers'
import { sql } from '@/lib/neon'
import { BookingRow } from '@/lib/types'
import { resolveClinicByHost } from '@/lib/publicClinic'

function normalizeBookingDate(date: string | Date) {
  return new Date(date).toISOString().split('T')[0]
}

export async function POST(req: Request) {
  try {
    const clinic = await resolveClinicByHost(req)
    if (!clinic) return Response.json({ message: 'Site público da clínica não encontrado.' }, { status: 404 })

    const body = await req.json()
    const { firstName, lastName, email, phone, message, date, time, professionalId } = body
    if (!firstName || !lastName || !email || !phone || !date || !time || !professionalId) {
      return Response.json({ message: 'Preencha nome, sobrenome, e-mail, telefone, data, horário e profissional.' }, { status: 400 })
    }

    const bookingDate = normalizeBookingDate(date)
    const conflicts = await sql`
      select id from bookings
       where clinic_id = ${clinic.id}::uuid
         and professional_id = ${professionalId}::uuid
         and date = ${bookingDate}
         and time = ${time}
         and status <> 'canceled'
       limit 1
    `

    if ((conflicts as unknown[]).length > 0) return Response.json({ message: 'Este horário não está mais disponível.' }, { status: 409 })

    const data = await sql`
      insert into bookings (clinic_id, first_name, last_name, email, phone, message, date, time, professional_id)
      values (${clinic.id}::uuid, ${firstName}, ${lastName}, ${email}, ${phone}, ${message || null}, ${bookingDate}, ${time}, ${professionalId}::uuid)
      returning *
    `

    return Response.json({ message: 'Agendamento criado', booking: (data as BookingRow[])[0] ? mapBooking((data as BookingRow[])[0]) : null })
  } catch (error) {
    console.error('booking.create', error)
    return Response.json({ message: 'Não foi possível concluir o agendamento. Tente novamente ou contate a clínica.' }, { status: 500 })
  }
}
