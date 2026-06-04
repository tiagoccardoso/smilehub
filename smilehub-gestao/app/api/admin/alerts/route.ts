import { requireClinicAccess } from '@/lib/clinic'
import { sql } from '@/lib/neon'

type Alert = {
  id: string
  title: string
  message: string
  href?: string
  severity?: 'info' | 'warning' | 'success' | 'danger'
}

export async function GET() {
  const { clinic } = await requireClinicAccess()
  const alerts: Alert[] = []

  const [appointments, overdue, treatments] = await Promise.all([
    sql`
      select a.id, a.appointment_date, a.start_time, p.full_name as patient_name, pr.full_name as professional_name
        from appointments a
        join patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id
        left join professionals pr on pr.id = a.professional_id and pr.clinic_id = a.clinic_id
       where a.clinic_id = ${clinic.id}::uuid
         and a.status in ('scheduled','confirmed')
         and a.appointment_date between current_date and current_date + interval '2 days'
       order by a.appointment_date asc, a.start_time asc
       limit 5
    `,
    sql`
      select id, description, due_date, amount
        from financial_entries
       where clinic_id = ${clinic.id}::uuid
         and status in ('pending','overdue')
         and due_date is not null
         and due_date < current_date
       order by due_date asc
       limit 5
    `,
    sql`
      select p.id, p.full_name as patient_name, count(*)::int as total
        from odontogram_entries o
        join patients p on p.id = o.patient_id and p.clinic_id = o.clinic_id
       where o.clinic_id = ${clinic.id}::uuid
         and o.status = 'in_progress'
       group by p.id, p.full_name
       order by max(o.updated_at) desc
       limit 5
    `,
  ])

  ;(appointments as any[]).forEach(item => {
    alerts.push({
      id: `appointment-${item.id}`,
      title: 'Agendamento próximo',
      message: `${item.patient_name} em ${new Date(item.appointment_date).toLocaleDateString('pt-BR')} às ${String(item.start_time).slice(0, 5)}${item.professional_name ? ` com ${item.professional_name}` : ''}`,
      href: '/admin/appointments',
      severity: 'info',
    })
  })

  ;(overdue as any[]).forEach(item => {
    alerts.push({
      id: `finance-${item.id}`,
      title: 'Recebimento vencido',
      message: `${item.description} · ${Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      href: '/admin/financial',
      severity: 'warning',
    })
  })

  ;(treatments as any[]).forEach(item => {
    alerts.push({
      id: `treatment-${item.id}`,
      title: 'Tratamento em andamento',
      message: `${item.patient_name} possui procedimento odontológico em andamento.`,
      href: '/admin/odontogram',
      severity: 'info',
    })
  })

  try {
    const nfseRows = await sql`
      select id, status, patient_name, error_message, number
        from nfse_invoices
       where clinic_id = ${clinic.id}::uuid
         and status in ('issued','failed','configuration_required')
       order by updated_at desc
       limit 5
    `
    ;(nfseRows as any[]).forEach(item => {
      alerts.push({
        id: `nfse-${item.id}`,
        title: item.status === 'issued' ? 'NFSe emitida' : item.status === 'failed' ? 'Falha na NFSe' : 'NFSe pendente de configuração',
        message: item.status === 'issued' ? `${item.patient_name || 'Tomador'} · nota ${item.number || ''}` : (item.error_message || 'Configure o provedor antes de emitir.'),
        href: '/admin/procedures#nfse',
        severity: item.status === 'issued' ? 'success' : item.status === 'failed' ? 'danger' : 'warning',
      })
    })
  } catch {
    // A migration da NFSe pode ainda não ter sido aplicada. Nesse caso, apenas omitimos alertas fiscais.
  }

  return Response.json({ alerts: alerts.slice(0, 12) })
}
