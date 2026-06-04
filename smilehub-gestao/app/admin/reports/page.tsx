import { requireClinicAccess, statusLabel } from '@/lib/clinic'
import { sql } from '@/lib/neon'

const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
const brl = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const datePt = (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess()
  const params = (await searchParams) ?? {}
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(params.start || '') ? params.start : firstDay
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(params.end || '') ? params.end : lastDay
  const professionalId = params.professional_id || ''
  const status = params.status || ''

  const professionals = await sql`select id, full_name from professionals where clinic_id = ${clinic.id}::uuid and is_active = true order by full_name`

  const [patientStats, appointmentStats, financeStats, topProcedures, professionalStats, treatmentStats, nfseStats] = await Promise.all([
    sql`
      select count(*)::int as total,
             count(*) filter (where created_at::date between ${startDate}::date and ${endDate}::date)::int as new_in_period,
             count(*) filter (where status = 'active')::int as active
        from patients
       where clinic_id = ${clinic.id}::uuid
    `,
    sql`
      select count(*)::int as total,
             count(*) filter (where status = 'completed')::int as completed,
             count(*) filter (where status = 'canceled')::int as canceled,
             count(*) filter (where status = 'no_show')::int as no_show
        from appointments
       where clinic_id = ${clinic.id}::uuid
         and appointment_date between ${startDate}::date and ${endDate}::date
         and (${professionalId || null}::uuid is null or professional_id = ${professionalId || null}::uuid)
         and (${status || null}::text is null or status::text = ${status || null})
    `,
    sql`
      select coalesce(sum(amount), 0)::numeric as total,
             coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric as paid,
             coalesce(sum(amount) filter (where status in ('pending','overdue')), 0)::numeric as open_amount,
             count(*) filter (where status in ('pending','overdue'))::int as open_count
        from financial_entries
       where clinic_id = ${clinic.id}::uuid
         and coalesce(paid_at::date, due_date, created_at::date) between ${startDate}::date and ${endDate}::date
    `,
    sql`
      select coalesce(pr.name, 'Procedimento manual') as name,
             count(*)::int as total,
             coalesce(sum(pr.amount), 0)::numeric as amount
        from odontogram_entries o
        left join procedures pr on pr.id = o.procedure_id and pr.clinic_id = o.clinic_id
       where o.clinic_id = ${clinic.id}::uuid
         and o.created_at::date between ${startDate}::date and ${endDate}::date
       group by coalesce(pr.name, 'Procedimento manual')
       order by total desc
       limit 8
    `,
    sql`
      select coalesce(pr.full_name, 'Sem profissional') as professional_name,
             count(a.id)::int as appointments,
             count(a.id) filter (where a.status = 'completed')::int as completed
        from appointments a
        left join professionals pr on pr.id = a.professional_id and pr.clinic_id = a.clinic_id
       where a.clinic_id = ${clinic.id}::uuid
         and a.appointment_date between ${startDate}::date and ${endDate}::date
       group by coalesce(pr.full_name, 'Sem profissional')
       order by appointments desc
       limit 8
    `,
    sql`
      select count(*) filter (where status = 'in_progress')::int as in_progress,
             count(*) filter (where status = 'completed')::int as completed,
             count(*) filter (where status = 'planned')::int as planned
        from odontogram_entries
       where clinic_id = ${clinic.id}::uuid
         and created_at::date between ${startDate}::date and ${endDate}::date
    `,
    (async () => {
      try {
        return await sql`
          select count(*)::int as total,
                 count(*) filter (where status = 'issued')::int as issued,
                 count(*) filter (where status in ('failed','configuration_required'))::int as attention,
                 coalesce(sum(amount) filter (where status = 'issued'), 0)::numeric as issued_amount
            from nfse_invoices
           where clinic_id = ${clinic.id}::uuid
             and created_at::date between ${startDate}::date and ${endDate}::date
        `
      } catch { return [{ total: 0, issued: 0, attention: 0, issued_amount: 0 }] }
    })(),
  ])

  const patients = (patientStats as any[])[0] || {}
  const appointments = (appointmentStats as any[])[0] || {}
  const finance = (financeStats as any[])[0] || {}
  const treatments = (treatmentStats as any[])[0] || {}
  const nfse = (nfseStats as any[])[0] || {}

  const cards = [
    { label: 'Pacientes ativos', value: patients.active || 0, hint: `${patients.new_in_period || 0} novos no período` },
    { label: 'Agendamentos', value: appointments.total || 0, hint: `${appointments.completed || 0} concluídos · ${appointments.canceled || 0} cancelados · ${appointments.no_show || 0} faltas` },
    { label: 'Faturamento pago', value: brl(finance.paid), hint: `${finance.open_count || 0} recebimentos em aberto (${brl(finance.open_amount)})` },
    { label: 'Tratamentos em andamento', value: treatments.in_progress || 0, hint: `${treatments.planned || 0} planejados · ${treatments.completed || 0} concluídos` },
    { label: 'NFSe emitidas', value: nfse.issued || 0, hint: `${nfse.attention || 0} pendências · ${brl(nfse.issued_amount)}` },
  ]

  return (
    <section className='space-y-6'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Relatórios gerenciais</p>
        <h1 className='text-2xl font-bold'>Relatórios</h1>
        <p className='text-sm text-gray-600'>Indicadores reais da clínica com filtros por período, profissional e status de agendamento.</p>
      </div>

      <form className='grid gap-3 rounded border bg-white p-4 md:grid-cols-4'>
        <label>Início<input name='start' type='date' defaultValue={startDate} /></label>
        <label>Fim<input name='end' type='date' defaultValue={endDate} /></label>
        <label>Profissional<select name='professional_id' defaultValue={professionalId}><option value=''>Todos</option>{(professionals as any[]).map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
        <label>Status<select name='status' defaultValue={status}><option value=''>Todos</option>{['scheduled','confirmed','in_progress','completed','canceled','no_show'].map(item => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
        <button type='submit'>Filtrar relatórios</button>
      </form>

      <div className='premium-stat-grid'>
        {cards.map(card => (
          <article key={card.label} className='premium-stat-card'>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span className='text-sm text-slate-500'>{card.hint}</span>
          </article>
        ))}
      </div>

      <div className='grid gap-5 xl:grid-cols-2'>
        <div className='rounded-xl border bg-white p-5 shadow-sm'>
          <h2 className='text-xl font-bold'>Serviços mais realizados</h2>
          {(topProcedures as any[]).length ? <div className='mt-4 overflow-auto'><table className='w-full text-sm'><thead><tr><th className='text-left'>Procedimento</th><th className='text-left'>Qtd.</th><th className='text-left'>Valor base</th></tr></thead><tbody>{(topProcedures as any[]).map(item => <tr key={item.name}><td>{item.name}</td><td>{item.total}</td><td>{brl(item.amount)}</td></tr>)}</tbody></table></div> : <p className='mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600'>Nenhum procedimento no período selecionado.</p>}
        </div>

        <div className='rounded-xl border bg-white p-5 shadow-sm'>
          <h2 className='text-xl font-bold'>Produtividade por profissional</h2>
          {(professionalStats as any[]).length ? <div className='mt-4 overflow-auto'><table className='w-full text-sm'><thead><tr><th className='text-left'>Profissional</th><th className='text-left'>Agendamentos</th><th className='text-left'>Concluídos</th></tr></thead><tbody>{(professionalStats as any[]).map(item => <tr key={item.professional_name}><td>{item.professional_name}</td><td>{item.appointments}</td><td>{item.completed}</td></tr>)}</tbody></table></div> : <p className='mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600'>Nenhum agendamento no período selecionado.</p>}
        </div>
      </div>

      <div className='rounded-xl border bg-white p-5 shadow-sm'>
        <h2 className='text-xl font-bold'>Resumo do período</h2>
        <div className='mt-3 grid gap-3 text-sm md:grid-cols-3'>
          <p className='rounded-xl bg-slate-50 p-3'><strong>Período:</strong><br />{datePt(startDate)} até {datePt(endDate)}</p>
          <p className='rounded-xl bg-slate-50 p-3'><strong>Comparecimento:</strong><br />{appointments.completed || 0} concluídos e {appointments.no_show || 0} faltas</p>
          <p className='rounded-xl bg-slate-50 p-3'><strong>NFSe:</strong><br />{nfse.total || 0} solicitações no período</p>
        </div>
      </div>
    </section>
  )
}
