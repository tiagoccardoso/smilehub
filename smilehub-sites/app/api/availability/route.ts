import { sql } from '@/lib/neon'
import { BookingRow } from '@/lib/types'
import { resolveClinicByHost } from '@/lib/publicClinic'
import { unstable_noStore as noStore } from 'next/cache'

type ProfessionalScheduleRow = {
  professional_id: string
  weekday: number
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
  appointment_duration_minutes: number
  is_active: boolean
}

const TZ = 'America/Sao_Paulo'

function toDateInSaoPaulo(dateText: string) { return new Date(`${dateText}T00:00:00-03:00`) }
function toMinuteOfDay(time: string) { const [h, m] = time.slice(0, 5).split(':').map(Number); return h * 60 + m }
function toTime(minutes: number) { const h = String(Math.floor(minutes / 60)).padStart(2, '0'); const m = String(minutes % 60).padStart(2, '0'); return `${h}:${m}:00` }
function isValidISODate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(toDateInSaoPaulo(date).getTime()) }

export async function GET(req: Request) {
  noStore()

  try {
    const clinic = await resolveClinicByHost(req)
    if (!clinic) return Response.json({ message: 'Site público da clínica não encontrado.', availableTimes: [] }, { status: 404 })

    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    const professionalId = url.searchParams.get('professionalId')

    if (!date || !professionalId) return Response.json({ message: 'Profissional e data são obrigatórios.', availableTimes: [] }, { status: 400 })
    if (!isValidISODate(date)) return Response.json({ message: 'Data inválida para consulta de disponibilidade.', availableTimes: [] }, { status: 400 })

    const selectedDate = toDateInSaoPaulo(date)
    const weekday = selectedDate.getUTCDay()

    const schedules = (await sql`
      select *
        from professional_schedules
       where clinic_id = ${clinic.id}::uuid
         and professional_id = ${professionalId}::uuid
         and weekday = ${weekday}
         and is_active = true
       limit 1
    `) as ProfessionalScheduleRow[]

    if (!Array.isArray(schedules) || !schedules.length) return Response.json({ message: 'Nenhum horário configurado para este dia.', availableTimes: [] })

    const schedule = schedules[0]
    const bookings = (await sql`
      select time, status
        from bookings
       where clinic_id = ${clinic.id}::uuid
         and date = ${date}
         and professional_id = ${professionalId}::uuid
    `) as Pick<BookingRow, 'time' | 'status'>[]

    const booked = new Set((bookings ?? []).filter(b => b.status !== 'canceled').map(b => b.time))
    const start = toMinuteOfDay(schedule.start_time)
    const end = toMinuteOfDay(schedule.end_time)
    const breakStart = schedule.break_start ? toMinuteOfDay(schedule.break_start) : null
    const breakEnd = schedule.break_end ? toMinuteOfDay(schedule.break_end) : null
    const nowInBr = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
    const todayBr = nowInBr.toISOString().slice(0, 10)

    const slots: string[] = []
    for (let current = start; current + schedule.appointment_duration_minutes <= end; current += schedule.appointment_duration_minutes) {
      const isInBreak = breakStart !== null && breakEnd !== null && current >= breakStart && current < breakEnd
      if (isInBreak) continue
      const time = toTime(current)
      const isPastToday = date === todayBr && toMinuteOfDay(time) <= nowInBr.getHours() * 60 + nowInBr.getMinutes()
      if (isPastToday) continue
      if (booked.has(time)) continue
      slots.push(time)
    }

    return Response.json({ message: 'Horários disponíveis encontrados.', availableTimes: slots })
  } catch (error) {
    console.error('availability.list', error)
    return Response.json({ message: 'Não foi possível carregar os horários disponíveis.', availableTimes: [] }, { status: 500 })
  }
}
