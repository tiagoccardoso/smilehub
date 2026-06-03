import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/neon'
import { financeStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { AdminIcon } from '@/app/components/admin/AdminIcon'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const parseMoney = (value: string) => Number(value.replace(/\./g, '').replace(',', '.')) || 0
const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

async function save(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'financial'])
  const id = optional(formData.get('id'))
  const patient = optional(formData.get('patient_id'))
  const description = optional(formData.get('description'))
  let target = '/admin/financial'

  try {
    if (!patient || !description) {
      target += '?error=Informe+paciente+e+descri%C3%A7%C3%A3o'
    } else if (id) {
      const updated = await sql`
        update financial_entries
           set patient_id = ${patient}::uuid,
               budget_id = ${optional(formData.get('budget_id'))}::uuid,
               description = ${description},
               payment_method = ${optional(formData.get('payment_method'))},
               due_date = ${optional(formData.get('due_date'))},
               amount = ${parseMoney(String(formData.get('amount') || '0'))},
               status = ${String(formData.get('status') || 'pending')}::finance_status
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `
      target += (updated as unknown[]).length ? '?ok=Registro+financeiro+atualizado+com+sucesso' : '?error=Registro+n%C3%A3o+encontrado'
    } else {
      await sql`
        insert into financial_entries (clinic_id, patient_id, budget_id, description, payment_method, due_date, amount, status)
        values (${clinic.id}::uuid, ${patient}::uuid, ${optional(formData.get('budget_id'))}::uuid, ${description}, ${optional(formData.get('payment_method'))}, ${optional(formData.get('due_date'))}, ${parseMoney(String(formData.get('amount') || '0'))}, ${String(formData.get('status') || 'pending')}::finance_status)
      `
      target += '?ok=Registro+financeiro+cadastrado+com+sucesso'
    }
  } catch (error) {
    console.error('financial.save', error)
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+registro'
  }

  revalidatePath('/admin/financial')
  redirect(target)
}

async function remove(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'financial'])
  let target = '/admin/financial'

  try {
    const id = optional(formData.get('id'))
    const deleted = id ? await sql`delete from financial_entries where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id` : []
    target += (deleted as unknown[]).length ? '?ok=Registro+financeiro+exclu%C3%ADdo+com+sucesso' : '?error=Registro+n%C3%A3o+encontrado'
  } catch (error) {
    console.error('financial.delete', error)
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+registro'
  }

  revalidatePath('/admin/financial')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'financial'])
  const params = (await searchParams) ?? {}

  const [rows, patientsResult, budgetsResult, summary] = await Promise.all([
    sql`
      select fe.*, p.full_name patient_name
        from financial_entries fe
        join patients p on p.id = fe.patient_id and p.clinic_id = fe.clinic_id
       where fe.clinic_id = ${clinic.id}::uuid
       order by fe.created_at desc
       limit 100
    `,
    sql`select id, full_name from patients where clinic_id = ${clinic.id}::uuid order by full_name`,
    sql`select id from budgets where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`,
    sql`
      select
        coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric as paid,
        coalesce(sum(amount) filter (where status = 'pending'), 0)::numeric as pending,
        coalesce(sum(amount) filter (where status = 'overdue'), 0)::numeric as overdue,
        count(*)::int as total
      from financial_entries
      where clinic_id = ${clinic.id}::uuid
    `,
  ])

  const patients = patientsResult as any[]
  const budgets = budgetsResult as any[]
  const totals = (summary as any[])[0] || {}
  const entries = rows as any[]

  const cards = [
    { label: 'Recebido', value: currency.format(Number(totals.paid || 0)), icon: 'trending_up' },
    { label: 'Pendente', value: currency.format(Number(totals.pending || 0)), icon: 'schedule' },
    { label: 'Vencido', value: currency.format(Number(totals.overdue || 0)), icon: 'warning' },
    { label: 'Lançamentos', value: Number(totals.total || 0).toLocaleString('pt-BR'), icon: 'receipt_long' },
  ]

  return (
    <section className='space-y-8'>
      <div className='premium-hero'>
        <span className='premium-kicker'><AdminIcon name='account_balance_wallet' className='admin-svg-icon' />Gestão financeira</span>
        <h1>Financeiro da clínica</h1>
        <p>Controle lançamentos, vencimentos, recebimentos e histórico financeiro vinculado a pacientes e orçamentos.</p>
      </div>

      <div className='premium-stat-grid'>
        {cards.map(card => (
          <article key={card.label} className='premium-stat-card'>
            <span className='premium-stat-icon'><AdminIcon name={card.icon} className='admin-svg-icon' /></span>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <FormFeedback ok={params.ok} error={params.error} />

      <form action={save} className='grid gap-3 md:grid-cols-2'>
        <select name='patient_id' required><option value=''>Paciente *</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select>
        <select name='budget_id'><option value=''>Orçamento</option>{budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.id.slice(0, 8)}</option>)}</select>
        <input name='description' required placeholder='Descrição *' />
        <input name='payment_method' placeholder='Forma de pagamento' />
        <input name='due_date' type='date' />
        <input name='amount' required placeholder='Valor ex: 100,00' />
        <select name='status'>{financeStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        <SubmitButton label='Cadastrar lançamento' />
      </form>

      <div className='overflow-auto'>
        <table className='w-full min-w-[980px] text-sm'>
          <thead><tr><th className='text-left'>Paciente</th><th className='text-left'>Descrição</th><th className='text-left'>Vencimento</th><th className='text-left'>Status</th><th className='text-left'>Valor</th><th className='text-left'>Ações</th></tr></thead>
          <tbody>{entries.map(entry => (
            <tr key={entry.id} className='align-top'>
              <td className='font-medium'>{entry.patient_name}</td>
              <td>{entry.description}</td>
              <td>{formatDate(entry.due_date)}</td>
              <td><span className='premium-status'>{statusLabel(entry.status)}</span></td>
              <td className='font-semibold text-[#041627]'>{currency.format(Number(entry.amount))}</td>
              <td className='space-y-2'>
                <details className='p-3'>
                  <summary className='cursor-pointer'>Editar</summary>
                  <form action={save} className='mt-3 grid gap-2'>
                    <input type='hidden' name='id' value={entry.id} />
                    <select name='patient_id' defaultValue={entry.patient_id}>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select>
                    <select name='budget_id' defaultValue={entry.budget_id || ''}><option value=''>Orçamento</option>{budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.id.slice(0, 8)}</option>)}</select>
                    <input name='description' defaultValue={entry.description} />
                    <input name='payment_method' defaultValue={entry.payment_method || ''} />
                    <input name='due_date' type='date' defaultValue={entry.due_date || ''} />
                    <input name='amount' defaultValue={String(entry.amount).replace('.', ',')} />
                    <select name='status' defaultValue={entry.status}>{financeStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                    <SubmitButton label='Atualizar' />
                  </form>
                </details>
                <form action={remove} className='p-0 shadow-none'>
                  <input type='hidden' name='id' value={entry.id} />
                  <DeleteConfirmButton message={`Excluir lançamento ${entry.description}?`} />
                </form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}
