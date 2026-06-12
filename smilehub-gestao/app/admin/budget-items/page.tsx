import { sql } from '@/lib/neon'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { AdminField, AdminFormHeader } from '../_components/premium-form'

const parseMoney = (value: string) => Number(value.replace(/\./g, '').replace(',', '.')) || 0
const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function save(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess()
  const id = optional(formData.get('id'))
  const budget = optional(formData.get('budget_id'))
  const description = optional(formData.get('description'))
  let target = '/admin/budget-items'
  try {
    if (!budget || !description) target += '?error=Informe+or%C3%A7amento+e+descri%C3%A7%C3%A3o'
    else if (id) {
      const updated = await sql`update budget_items set budget_id=${budget}::uuid, procedure_id=${optional(formData.get('procedure_id'))}::uuid, description=${description}, quantity=${Number(formData.get('quantity') || 1)}, unit_amount=${parseMoney(String(formData.get('unit_amount') || '0'))} where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id`
      target += (updated as unknown[]).length ? '?ok=Item+atualizado+com+sucesso' : '?error=Item+n%C3%A3o+encontrado'
    } else {
      await sql`insert into budget_items (clinic_id,budget_id,procedure_id,description,quantity,unit_amount) values (${clinic.id}::uuid,${budget}::uuid,${optional(formData.get('procedure_id'))}::uuid,${description},${Number(formData.get('quantity') || 1)},${parseMoney(String(formData.get('unit_amount') || '0'))})`
      target += '?ok=Item+cadastrado+com+sucesso'
    }
    await sql`update budgets set total_amount=coalesce((select sum(line_total) from budget_items where clinic_id=${clinic.id}::uuid and budget_id=${budget}::uuid),0) where id=${budget}::uuid and clinic_id=${clinic.id}::uuid`
  } catch (error) { console.error('budget_items.save'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+item' }
  revalidatePath('/admin/budget-items'); revalidatePath('/admin/budgets'); redirect(target)
}

async function remove(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess()
  let target = '/admin/budget-items'
  try {
    const id = optional(formData.get('id'))
    const budget = optional(formData.get('budget_id'))
    const deleted = id ? await sql`delete from budget_items where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id` : []
    if (budget) await sql`update budgets set total_amount=coalesce((select sum(line_total) from budget_items where clinic_id=${clinic.id}::uuid and budget_id=${budget}::uuid),0) where id=${budget}::uuid and clinic_id=${clinic.id}::uuid`
    target += (deleted as unknown[]).length ? '?ok=Item+exclu%C3%ADdo+com+sucesso' : '?error=Item+n%C3%A3o+encontrado'
  } catch (error) { console.error('budget_items.delete'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+item' }
  revalidatePath('/admin/budget-items'); revalidatePath('/admin/budgets'); redirect(target)
}

function BudgetItemForm({ item, budgets, procedures }: { item?: any; budgets: any[]; procedures: any[] }) {
  const isEditing = Boolean(item)
  return (
    <form action={save} className={`admin-form-card ${isEditing ? 'mt-3' : ''}`}>
      {isEditing ? <input type='hidden' name='id' value={item.id} /> : null}
      {!isEditing ? <AdminFormHeader title='Cadastrar item do orçamento' description='Vincule o item ao orçamento, informe o procedimento quando houver e revise quantidade e valor unitário.' /> : null}
      <div className='admin-form-grid'>
        <AdminField label='Orçamento' required>
          <select name='budget_id' defaultValue={item?.budget_id || ''} required>
            <option value=''>Selecione o orçamento</option>
            {budgets.map(budget => <option key={budget.id} value={budget.id}>{budget.id.slice(0, 8)} - {budget.patient_name} ({statusLabel(budget.status)})</option>)}
          </select>
        </AdminField>
        <AdminField label='Procedimento'>
          <select name='procedure_id' defaultValue={item?.procedure_id || ''}>
            <option value=''>Procedimento manual</option>
            {procedures.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
          </select>
        </AdminField>
        <AdminField label='Descrição' required>
          <input name='description' defaultValue={item?.description || ''} required placeholder='Descrição do item' />
        </AdminField>
        <AdminField label='Quantidade' required>
          <input name='quantity' type='number' min={1} defaultValue={item?.quantity || 1} required />
        </AdminField>
        <AdminField label='Valor unitário' required>
          <input name='unit_amount' defaultValue={item ? String(item.unit_amount).replace('.', ',') : ''} required placeholder='Ex.: 120,00' />
        </AdminField>
      </div>
      <div className='admin-form-actions'><SubmitButton label={isEditing ? 'Atualizar item' : 'Cadastrar item'} /></div>
    </form>
  )
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess()
  const params = (await searchParams) ?? {}
  const [items, budgets, procedures] = await Promise.all([
    sql`select bi.*,b.patient_id,p.full_name patient_name,pr.name procedure_name from budget_items bi join budgets b on b.id=bi.budget_id and b.clinic_id=bi.clinic_id join patients p on p.id=b.patient_id and p.clinic_id=b.clinic_id left join procedures pr on pr.id=bi.procedure_id and pr.clinic_id=bi.clinic_id where bi.clinic_id=${clinic.id}::uuid order by bi.created_at desc limit 100`,
    sql`select b.id,p.full_name patient_name,b.status from budgets b join patients p on p.id=b.patient_id and p.clinic_id=b.clinic_id where b.clinic_id=${clinic.id}::uuid order by b.created_at desc limit 200`,
    sql`select id,name from procedures where clinic_id=${clinic.id}::uuid and is_active=true order by name`,
  ])
  const budgetRows = budgets as any[]
  const procedureRows = procedures as any[]

  return <section className='space-y-6'>
    <div><h1>Itens do Orçamento</h1><p>Inclua, edite e remova itens vinculados aos orçamentos.</p></div>
    <FormFeedback ok={params.ok} error={params.error} />
    <BudgetItemForm budgets={budgetRows} procedures={procedureRows} />
    <div className='overflow-auto rounded border'>
      <table className='w-full min-w-[980px] text-sm'>
        <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Paciente</th><th className='p-2 text-left'>Descrição</th><th className='p-2 text-left'>Qtd.</th><th className='p-2 text-left'>Total</th><th className='p-2 text-left'>Ações</th></tr></thead>
        <tbody>{(items as any[]).map(item => <tr key={item.id} className='border-t align-top'><td className='p-2'>{item.patient_name}</td><td className='p-2 font-medium'>{item.description}</td><td className='p-2'>{item.quantity}</td><td className='p-2'>{Number(item.line_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className='space-y-2 p-2'><details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary><BudgetItemForm item={item} budgets={budgetRows} procedures={procedureRows} /></details><form action={remove}><input type='hidden' name='id' value={item.id} /><input type='hidden' name='budget_id' value={item.budget_id} /><DeleteConfirmButton message={`Excluir item ${item.description}?`} /></form></td></tr>)}</tbody>
      </table>
    </div>
  </section>
}
