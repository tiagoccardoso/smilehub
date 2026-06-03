import { mapBooking } from '@/lib/dbMappers'
import { sql } from '@/lib/neon'
import { BookingRow } from '@/lib/types'
import { requireClinicAccess } from '@/lib/clinic'
import { resolveClinicByHost } from '@/lib/publicClinic'

function normalizeBookingDate(date: string | Date) {
  return new Date(date).toISOString().split('T')[0]
}

function buildSearchSql(term: string) {
  const search = `%${term.trim()}%`
  return search
}

export async function GET(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const url = new URL(req.url)
    const _id = url.searchParams.get('_id')

    if (_id) {
      const data = await sql`select * from bookings where clinic_id = ${clinic.id}::uuid and id = ${_id}::uuid limit 1`
      return Response.json({ message: 'Agendamento encontrado', booking: (data as BookingRow[])[0] ? mapBooking((data as BookingRow[])[0]) : null })
    }

    const status = url.searchParams.get('status') ?? 'all'
    const search = url.searchParams.get('search') ?? ''
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = 9
    const offset = pageSize * (page - 1)
    const searchLike = buildSearchSql(search)

    const data = status !== 'all'
      ? await sql`
          select * from bookings
           where clinic_id = ${clinic.id}::uuid
             and status = ${status}::booking_status
             and (${!search.trim()} or first_name ilike ${searchLike} or last_name ilike ${searchLike} or phone ilike ${searchLike} or email ilike ${searchLike})
           order by status desc, date asc, time asc
           limit ${pageSize} offset ${offset}
        `
      : await sql`
          select * from bookings
           where clinic_id = ${clinic.id}::uuid
             and (${!search.trim()} or first_name ilike ${searchLike} or last_name ilike ${searchLike} or phone ilike ${searchLike} or email ilike ${searchLike})
           order by status desc, date asc, time asc
           limit ${pageSize} offset ${offset}
        `

    const countRows = status !== 'all'
      ? await sql`
          select count(*)::int as total from bookings
           where clinic_id = ${clinic.id}::uuid
             and status = ${status}::booking_status
             and (${!search.trim()} or first_name ilike ${searchLike} or last_name ilike ${searchLike} or phone ilike ${searchLike} or email ilike ${searchLike})
        `
      : await sql`
          select count(*)::int as total from bookings
           where clinic_id = ${clinic.id}::uuid
             and (${!search.trim()} or first_name ilike ${searchLike} or last_name ilike ${searchLike} or phone ilike ${searchLike} or email ilike ${searchLike})
        `

    const total = (countRows as { total: number }[])[0]?.total ?? 0
    return Response.json({ message: 'Agendamentos encontrados', bookings: (data as BookingRow[]).map(mapBooking), totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('booking.get', error)
    return Response.json({ message: 'Não foi possível carregar os agendamentos.', bookings: [], totalPages: 0 }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const clinic = await resolveClinicByHost(req)
    if (!clinic) return Response.json({ message: 'Site público da clínica não encontrado.' }, { status: 404 })

    const body = await req.json()
    const { firstName, lastName, email, phone, message, date, time, professionalId } = body
    if (!professionalId) return Response.json({ message: 'Profissional é obrigatório' }, { status: 400 })

    const bookingDate = normalizeBookingDate(date)
    const conflicts = await sql`
      select id
        from bookings
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

export async function PUT(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const url = new URL(req.url)
    const _id = url.searchParams.get('_id')

    if (!_id) return Response.json({ message: 'Agendamento inválido' }, { status: 400 })

    const data = await sql`
      update bookings
         set status = 'completed'
       where id = ${_id}::uuid and clinic_id = ${clinic.id}::uuid
       returning *
    `

    return Response.json({ message: 'Agendamento atualizado', booking: (data as BookingRow[])[0] ? mapBooking((data as BookingRow[])[0]) : null })
  } catch (error) {
    console.error('booking.update', error)
    return Response.json({ message: 'Não foi possível atualizar o agendamento.' }, { status: 500 })
  }
}
