import { requireClinicAccess, statusLabel } from '@/lib/clinic'
import { sql } from '@/lib/neon'

function cleanQuery(value: string | null) {
  return String(value || '').trim().slice(0, 80)
}

function like(value: string) {
  return `%${value.replace(/[%_]/g, '')}%`
}

export async function GET(req: Request) {
  const { clinic } = await requireClinicAccess()
  const url = new URL(req.url)
  const q = cleanQuery(url.searchParams.get('q'))
  if (q.length < 2) return Response.json({ groups: [] })
  const term = like(q)

  const [patients, professionals, procedures, appointments, finance] = await Promise.all([
    sql`
      select id, full_name, phone, email
        from patients
       where clinic_id = ${clinic.id}::uuid
         and (full_name ilike ${term} or phone ilike ${term} or coalesce(email, '') ilike ${term} or coalesce(cpf, '') ilike ${term})
       order by full_name
       limit 6
    `,
    sql`
      select id, full_name, specialty, cro
        from professionals
       where clinic_id = ${clinic.id}::uuid
         and (full_name ilike ${term} or coalesce(specialty, '') ilike ${term} or coalesce(cro, '') ilike ${term})
       order by full_name
       limit 6
    `,
    sql`
      select id, name, category, amount
        from procedures
       where clinic_id = ${clinic.id}::uuid
         and (name ilike ${term} or coalesce(category, '') ilike ${term} or coalesce(description, '') ilike ${term})
       order by name
       limit 6
    `,
    sql`
      select a.id, a.appointment_date, a.start_time, a.status, p.full_name as patient_name, pr.full_name as professional_name
        from appointments a
        join patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id
        left join professionals pr on pr.id = a.professional_id and pr.clinic_id = a.clinic_id
       where a.clinic_id = ${clinic.id}::uuid
         and (p.full_name ilike ${term} or coalesce(pr.full_name, '') ilike ${term} or coalesce(a.notes, '') ilike ${term})
       order by a.appointment_date desc, a.start_time desc
       limit 6
    `,
    sql`
      select f.id, f.description, f.status, f.amount, p.full_name as patient_name
        from financial_entries f
        join patients p on p.id = f.patient_id and p.clinic_id = f.clinic_id
       where f.clinic_id = ${clinic.id}::uuid
         and (f.description ilike ${term} or p.full_name ilike ${term})
       order by f.created_at desc
       limit 6
    `,
  ])

  const groups = [
    {
      category: 'Pacientes',
      items: (patients as any[]).map(item => ({
        id: item.id,
        title: item.full_name,
        subtitle: [item.phone, item.email].filter(Boolean).join(' · '),
        href: '/admin/patients',
      })),
    },
    {
      category: 'Profissionais',
      items: (professionals as any[]).map(item => ({
        id: item.id,
        title: item.full_name,
        subtitle: [item.specialty, item.cro].filter(Boolean).join(' · '),
        href: '/admin/professionals',
      })),
    },
    {
      category: 'Serviços e procedimentos',
      items: (procedures as any[]).map(item => ({
        id: item.id,
        title: item.name,
        subtitle: `${item.category || 'Sem categoria'} · ${Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        href: '/admin/procedures',
      })),
    },
    {
      category: 'Agendamentos',
      items: (appointments as any[]).map(item => ({
        id: item.id,
        title: item.patient_name,
        subtitle: `${new Date(item.appointment_date).toLocaleDateString('pt-BR')} às ${String(item.start_time).slice(0, 5)} · ${statusLabel(item.status)}${item.professional_name ? ` · ${item.professional_name}` : ''}`,
        href: '/admin/appointments',
      })),
    },
    {
      category: 'Financeiro',
      items: (finance as any[]).map(item => ({
        id: item.id,
        title: item.description,
        subtitle: `${item.patient_name} · ${statusLabel(item.status)} · ${Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        href: '/admin/financial',
      })),
    },
  ]

  return Response.json({ groups })
}
