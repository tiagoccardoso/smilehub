import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/neon'
import { budgetStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { AdminField, AdminFormHeader } from '../_components/premium-form'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function save(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess()
  const id = optional(formData.get('id'))
  const patient = optional(formData.get('patient_id'))
  let target = '/admin/budgets'
  try {
    if (!patient) target += '?error=Informe+o+paciente'
    else if (id) {
      const updated = await sql`update budgets set patient_id=${patient}::uuid,status=${String(formData.get('status') || 'draft')}::budget_status,notes=${optional(formData.get('notes'))} where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id`
      target += (updated as unknown[]).length ? '?ok=Or%C3%A7amento+atualizado+com+sucesso' : '?error=Or%C3%A7amento+n%C3%A3o+encontrado'
    } else {
      await sql`insert into budgets (clinic_id,patient_id,status,notes) values (${clinic.id}::uuid,${patient}::uuid,${String(formData.get('status') || 'draft')}::budget_status,${optional(formData.get('notes'))})`
      target += '?ok=Or%C3%A7amento+cadastrado+com+sucesso'
    }
  } catch (error) { console.error('budgets.save'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+or%C3%A7amento' }
  revalidatePath('/admin/budgets'); redirect(target)
}

async function remove(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess()
  let target = '/admin/budgets'
  try {
    const id = optional(formData.get('id'))
    const deleted = id ? await sql`delete from budgets where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id` : []
    target += (deleted as unknown[]).length ? '?ok=Or%C3%A7amento+exclu%C3%ADdo+com+sucesso' : '?error=Or%C3%A7amento+n%C3%A3o+encontrado'
  } catch (error) { console.error('budgets.delete'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+or%C3%A7amento' }
  revalidatePath('/admin/budgets'); redirect(target)
}

function BudgetForm({ budget, patients }: { budget?: any; patients: any[] }) {
  const isEditing = Boolean(budget)
  return (
    <form action={save} className={`admin-form-card ${isEditing ? 'mt-3' : ''}`}>
      {isEditing ? <input type='hidden' name='id' value={budget.id} /> : null}
      {!isEditing ? <AdminFormHeader title='Cadastrar orçamento' description='Selecione o paciente, defina o status e registre observações úteis para o orçamento.' /> : null}
      <div className='admin-form-grid'>
        <AdminField label='Paciente' required>
          <select name='patient_id' defaultValue={budget?.patient_id || ''} required>
            <option value=''>Selecione o paciente</option>
            {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
          </select>
        </AdminField>
        <AdminField label='Status'>
          <select name='status' defaultValue={budget?.status || 'draft'}>{budgetStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        </AdminField>
        <AdminField label='Observações' className='md:col-span-2'>
          <textarea name='notes' defaultValue={budget?.notes || ''} placeholder='Condições, orientações ou detalhes do orçamento' />
        </AdminField>
      </div>
      <div className='admin-form-actions'><SubmitButton label={isEditing ? 'Atualizar orçamento' : 'Cadastrar orçamento'} /></div>
    </form>
  )
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess()
  const params = (await searchParams) ?? {}
  const [budgets, patients] = await Promise.all([
    sql`select b.*,p.full_name patient_name from budgets b join patients p on p.id=b.patient_id and p.clinic_id=b.clinic_id where b.clinic_id=${clinic.id}::uuid order by b.created_at desc limit 100`,
    sql`select id,full_name from patients where clinic_id=${clinic.id}::uuid order by full_name`,
  ])
  const patientRows = patients as any[]

  return <section className='space-y-6'>
    <div><h1>Orçamentos</h1><p>Controle de orçamentos dos pacientes.</p></div>
    <FormFeedback ok={params.ok} error={params.error} />
    <BudgetForm patients={patientRows} />
    <div className='overflow-auto rounded border'>
      <table className='w-full min-w-[860px] text-sm'>
        <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Paciente</th><th className='p-2 text-left'>Status</th><th className='p-2 text-left'>Total</th><th className='p-2 text-left'>Ações</th></tr></thead>
        <tbody>{(budgets as any[]).map(budget => <tr key={budget.id} className='border-t align-top'><td className='p-2 font-medium'>{budget.patient_name}</td><td className='p-2'>{statusLabel(budget.status)}</td><td className='p-2'>{Number(budget.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className='space-y-2 p-2'><details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary><BudgetForm budget={budget} patients={patientRows} /></details><form action={remove}><input type='hidden' name='id' value={budget.id} /><DeleteConfirmButton message={`Excluir orçamento de ${budget.patient_name}?`} /></form></td></tr>)}</tbody>
      </table>
    </div>
  </section>
}
