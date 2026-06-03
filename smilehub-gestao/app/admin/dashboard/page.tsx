import Link from 'next/link'
import { requireClinicAccess } from '@/lib/clinic'
import { sql } from '@/lib/neon'
import { AdminIcon } from '@/app/components/admin/AdminIcon'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR')

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : '--:--'
}

export default async function DashboardPage() {
  const { clinic } = await requireClinicAccess()

  const today = new Date().toISOString().slice(0, 10)
  const [patients, professionals, appointments, todayAppointments, procedures, pendingFinance, overdueFinance, monthlyRevenue, upcoming, recentPatients] = await Promise.all([
    sql`select count(*)::int as total from patients where clinic_id = ${clinic.id}::uuid`,
    sql`select count(*)::int as total from professionals where clinic_id = ${clinic.id}::uuid and is_active = true`,
    sql`select count(*)::int as total from appointments where clinic_id = ${clinic.id}::uuid`,
    sql`select count(*)::int as total from appointments where clinic_id = ${clinic.id}::uuid and appointment_date = ${today}`,
    sql`select count(*)::int as total from procedures where clinic_id = ${clinic.id}::uuid and is_active = true`,
    sql`select coalesce(sum(amount), 0)::numeric as total from financial_entries where clinic_id = ${clinic.id}::uuid and status = 'pending'`,
    sql`select coalesce(sum(amount), 0)::numeric as total from financial_entries where clinic_id = ${clinic.id}::uuid and status = 'overdue'`,
    sql`
      select coalesce(sum(amount), 0)::numeric as total
        from financial_entries
       where clinic_id = ${clinic.id}::uuid
         and status = 'paid'
         and date_trunc('month', coalesce(due_date, created_at::date)) = date_trunc('month', current_date)
    `,
    sql`
      select a.id, a.appointment_date, a.start_time, a.status, p.full_name as patient_name, pr.full_name as professional_name, proc.name as procedure_name
        from appointments a
        join patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id
        left join professionals pr on pr.id = a.professional_id and pr.clinic_id = a.clinic_id
        left join procedures proc on proc.id = a.procedure_id and proc.clinic_id = a.clinic_id
       where a.clinic_id = ${clinic.id}::uuid and a.appointment_date >= ${today} and a.status not in ('canceled', 'no_show')
       order by a.appointment_date asc, a.start_time asc
       limit 5
    `,
    sql`select full_name, phone, created_at from patients where clinic_id = ${clinic.id}::uuid order by created_at desc limit 5`,
  ])

  const stats = [
    { label: 'Pacientes cadastrados', value: number.format((patients as any[])[0]?.total ?? 0), icon: 'groups' },
    { label: 'Profissionais ativos', value: number.format((professionals as any[])[0]?.total ?? 0), icon: 'badge' },
    { label: 'Agendamentos hoje', value: number.format((todayAppointments as any[])[0]?.total ?? 0), icon: 'calendar_today' },
    { label: 'Receita mensal', value: currency.format(Number((monthlyRevenue as any[])[0]?.total ?? 0)), icon: 'trending_up' },
  ]

  const secondaryStats = [
    { label: 'Agendamentos totais', value: number.format((appointments as any[])[0]?.total ?? 0), icon: 'event_available' },
    { label: 'Procedimentos ativos', value: number.format((procedures as any[])[0]?.total ?? 0), icon: 'medical_services' },
    { label: 'Financeiro pendente', value: currency.format(Number((pendingFinance as any[])[0]?.total ?? 0)), icon: 'account_balance_wallet' },
    { label: 'Financeiro vencido', value: currency.format(Number((overdueFinance as any[])[0]?.total ?? 0)), icon: 'warning' },
  ]

  const nextAppointment = (upcoming as any[])[0]

  return (
    <section className='space-y-8'>
      <div className='premium-hero'>
        <span className='premium-kicker'><AdminIcon name='health_and_safety' className='admin-svg-icon' />Central operacional</span>
        <h1>Painel premium da clínica</h1>
        <p>
          Acompanhe agenda, pacientes, equipe e financeiro com uma visão executiva do SmileHub, usando dados reais do banco da clínica.
        </p>
        <div className='premium-actions'>
          <Link className='premium-button-primary' href='/admin/agenda'><AdminIcon name='add' className='admin-svg-icon' />Novo agendamento</Link>
          <Link className='premium-button-secondary' href='/admin/patients'><AdminIcon name='person_add' className='admin-svg-icon' />Novo paciente</Link>
        </div>
      </div>

      <div className='premium-stat-grid'>
        {stats.map(card => (
          <article key={card.label} className='premium-stat-card'>
            <span className='premium-stat-icon'><AdminIcon name={card.icon} className='admin-svg-icon' /></span>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className='premium-panel-grid'>
        <article className='premium-panel'>
          <div className='premium-panel-header'>
            <div>
              <h2>Próximos atendimentos</h2>
              <p>Agenda ordenada por data e horário.</p>
            </div>
            <Link href='/admin/agenda' className='premium-status'>Ver agenda</Link>
          </div>
          <div className='premium-list'>
            {(upcoming as any[]).length ? (upcoming as any[]).map(item => (
              <div key={item.id} className='premium-list-item'>
                <div>
                  <strong>{item.patient_name}</strong>
                  <span>{item.procedure_name || 'Procedimento não definido'} · {item.professional_name || 'Profissional não definido'}</span>
                </div>
                <small>{formatDate(item.appointment_date)} · {formatTime(item.start_time)}</small>
              </div>
            )) : <p className='text-sm text-gray-500'>Nenhum agendamento futuro encontrado.</p>}
          </div>
        </article>

        <aside className='premium-panel'>
          <div className='premium-panel-header'>
            <div>
              <h2>Próximo paciente</h2>
              <p>Atalho para preparar o atendimento.</p>
            </div>
            <span className='premium-status'>Hoje</span>
          </div>
          {nextAppointment ? (
            <div className='space-y-4'>
              <div className='rounded-[22px] bg-[#f2f4f6] p-5'>
                <p className='text-sm font-bold text-gray-500'>Paciente</p>
                <h3 className='mt-1 text-2xl font-extrabold text-[#041627]'>{nextAppointment.patient_name}</h3>
                <p className='mt-2 text-sm text-gray-600'>{formatDate(nextAppointment.appointment_date)} às {formatTime(nextAppointment.start_time)}</p>
              </div>
              <Link href='/admin/records' className='premium-button-primary w-full bg-[#041627] text-white'>Abrir prontuário</Link>
            </div>
          ) : (
            <p className='rounded-[22px] bg-[#f2f4f6] p-5 text-sm text-gray-600'>Nenhum atendimento futuro para exibir.</p>
          )}
        </aside>
      </div>

      <div className='premium-panel-grid'>
        <article className='premium-panel'>
          <div className='premium-panel-header'>
            <div>
              <h2>Resumo financeiro e operacional</h2>
              <p>Indicadores complementares para acompanhamento rápido.</p>
            </div>
          </div>
          <div className='premium-stat-grid'>
            {secondaryStats.map(card => (
              <div key={card.label} className='rounded-[22px] border border-slate-200 bg-white p-5'>
                <span className='premium-stat-icon'><AdminIcon name={card.icon} className='admin-svg-icon' /></span>
                <p className='mt-3 text-sm font-bold text-gray-500'>{card.label}</p>
                <strong className='mt-1 block text-2xl font-extrabold text-[#041627]'>{card.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className='premium-panel'>
          <div className='premium-panel-header'>
            <div>
              <h2>Cadastros recentes</h2>
              <p>Últimos pacientes adicionados.</p>
            </div>
          </div>
          <div className='premium-list'>
            {(recentPatients as any[]).length ? (recentPatients as any[]).map((patient, index) => (
              <div key={`${patient.full_name}-${index}`} className='premium-list-item'>
                <div>
                  <strong>{patient.full_name}</strong>
                  <span>{patient.phone || 'Telefone não informado'}</span>
                </div>
                <small>{new Date(patient.created_at).toLocaleDateString('pt-BR')}</small>
              </div>
            )) : <p className='text-sm text-gray-500'>Nenhum paciente cadastrado.</p>}
          </div>
        </article>
      </div>
    </section>
  )
}
