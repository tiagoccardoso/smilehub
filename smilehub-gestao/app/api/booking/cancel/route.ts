import { mapBooking } from '@/lib/dbMappers'
import { sql } from '@/lib/neon'
import { BookingRow } from '@/lib/types'
import { requireClinicAccess } from '@/lib/clinic'

export async function PUT(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const url = new URL(req.url)
    const _id = url.searchParams.get('_id')
    if (!_id) return Response.json({ message: 'Agendamento inválido' }, { status: 400 })

    const data = await sql`
      update bookings
         set status = 'canceled'
       where id = ${_id}::uuid and clinic_id = ${clinic.id}::uuid
       returning *
    `

    return Response.json({ message: 'Agendamento atualizado', booking: (data as BookingRow[])[0] ? mapBooking((data as BookingRow[])[0]) : null })
  } catch (error) {
    console.error('booking.cancel', error)
    return Response.json({ message: 'Não foi possível cancelar o agendamento.' }, { status: 500 })
  }
}
