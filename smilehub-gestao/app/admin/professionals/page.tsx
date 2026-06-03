import { sql } from '@/lib/neon'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireClinicAccess } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

async function requireAccess() {
  return requireClinicAccess(['superadmin', 'admin', 'reception'])
}

async function saveProfessional(formData: FormData) {
  'use server'
  const { clinic } = await requireAccess()
  const id = optional(formData.get('id'))
  const fullName = optional(formData.get('full_name'))
  let target = '/admin/professionals'
  try {
    if (!fullName) target += '?error=Informe+o+nome+do+profissional'
    else if (id) {
      const updated = await sql`update professionals set full_name=${fullName}, specialty=${optional(formData.get('specialty'))}, cro=${optional(formData.get('cro'))}, schedule_notes=${optional(formData.get('schedule_notes'))}, is_active=${formData.get('is_active') === 'on'} where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id`
      target += (updated as unknown[]).length ? '?ok=Profissional+atualizado+com+sucesso' : '?error=Profissional+n%C3%A3o+encontrado'
    } else {
      await sql`insert into professionals (clinic_id, full_name, specialty, cro, schedule_notes, is_active) values (${clinic.id}::uuid, ${fullName}, ${optional(formData.get('specialty'))}, ${optional(formData.get('cro'))}, ${optional(formData.get('schedule_notes'))}, ${formData.get('is_active') === 'on'})`
      target += '?ok=Profissional+cadastrado+com+sucesso'
    }
  } catch (error) { console.error('professionals.save'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+profissional' }
  revalidatePath('/admin/professionals'); redirect(target)
}

async function deleteProfessional(formData: FormData) {
  'use server'
  const { clinic } = await requireAccess()
  let target = '/admin/professionals'
  try {
    const id = optional(formData.get('id'))
    const deleted = id ? await sql`delete from professionals where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id` : []
    target += (deleted as unknown[]).length ? '?ok=Profissional+exclu%C3%ADdo+com+sucesso' : '?error=Profissional+n%C3%A3o+encontrado'
  } catch (error) { console.error('professionals.delete'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir.+Verifique+v%C3%ADnculos' }
  revalidatePath('/admin/professionals'); redirect(target)
}

async function saveSchedule(formData: FormData) {
  'use server'
  const { clinic } = await requireAccess()
  let target = '/admin/professionals'
  try {
    const professionalId = optional(formData.get('professional_id'))
    const weekday = Number(formData.get('weekday'))
    const startTime = optional(formData.get('start_time'))
    const endTime = optional(formData.get('end_time'))
    if (!professionalId || Number.isNaN(weekday) || !startTime || !endTime) target += '?error=Preencha+os+campos+obrigat%C3%B3rios+da+agenda'
    else {
      await sql`
        insert into professional_schedules (clinic_id, professional_id, weekday, start_time, end_time, break_start, break_end, appointment_duration_minutes, is_active)
        values (${clinic.id}::uuid, ${professionalId}::uuid, ${weekday}, ${startTime}::time, ${endTime}::time, ${optional(formData.get('break_start'))}::time, ${optional(formData.get('break_end'))}::time, ${Number(formData.get('appointment_duration_minutes') || 60)}, ${formData.get('is_active') === 'on'})
        on conflict (clinic_id, professional_id, weekday) do update set start_time=excluded.start_time, end_time=excluded.end_time, break_start=excluded.break_start, break_end=excluded.break_end, appointment_duration_minutes=excluded.appointment_duration_minutes, is_active=excluded.is_active
      `
      target += '?ok=Agenda+do+profissional+salva+com+sucesso'
    }
  } catch (error) { console.error('professionals.schedule.save'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+a+agenda' }
  revalidatePath('/admin/professionals'); redirect(target)
}

async function deleteSchedule(formData: FormData) {
  'use server'
  const { clinic } = await requireAccess()
  let target = '/admin/professionals'
  try {
    const id = optional(formData.get('id'))
    const deleted = id ? await sql`delete from professional_schedules where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id` : []
    target += (deleted as unknown[]).length ? '?ok=Agenda+exclu%C3%ADda+com+sucesso' : '?error=Agenda+n%C3%A3o+encontrada'
  } catch (error) { console.error('professionals.schedule.delete'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+a+agenda' }
  revalidatePath('/admin/professionals'); redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireAccess()
  const params = (await searchParams) ?? {}
  const [professionals, schedules] = await Promise.all([
    sql`select * from professionals where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`,
    sql`select ps.*, p.full_name from professional_schedules ps join professionals p on p.id=ps.professional_id where ps.clinic_id = ${clinic.id}::uuid order by p.full_name, ps.weekday`,
  ])
  const professionalRows = professionals as any[]
  return <section className='space-y-6'>
    <div><h1 className='text-2xl font-bold'>Profissionais</h1><p className='text-sm text-gray-600'>Cadastro de profissionais e configuração de horários de atendimento.</p></div>
    <FormFeedback ok={params.ok} error={params.error} />
    <form action={saveProfessional} className='grid gap-3 rounded border bg-white p-4 md:grid-cols-2'>
      <input name='full_name' required placeholder='Nome completo *' /><input name='specialty' placeholder='Especialidade' /><input name='cro' placeholder='CRO' />
      <textarea name='schedule_notes' className='md:col-span-2' placeholder='Observações da agenda' /><label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked />Ativo</label><SubmitButton label='Cadastrar profissional' />
    </form>
    <div className='grid gap-6 lg:grid-cols-2'>
      <div className='overflow-auto rounded border'><table className='w-full min-w-[760px] text-sm'><thead className='bg-gray-50'><tr><th className='p-2 text-left'>Nome</th><th className='p-2 text-left'>Especialidade</th><th className='p-2 text-left'>CRO</th><th className='p-2 text-left'>Ações</th></tr></thead><tbody>{professionalRows.map(row => <tr key={row.id} className='border-t align-top'><td className='p-2 font-medium'>{row.full_name}</td><td className='p-2'>{row.specialty || '-'}</td><td className='p-2'>{row.cro || '-'}</td><td className='space-y-2 p-2'><details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary><form action={saveProfessional} className='mt-3 grid gap-2'><input type='hidden' name='id' value={row.id} /><input name='full_name' defaultValue={row.full_name} required /><input name='specialty' defaultValue={row.specialty || ''} /><input name='cro' defaultValue={row.cro || ''} /><textarea name='schedule_notes' defaultValue={row.schedule_notes || ''} /><label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked={row.is_active} />Ativo</label><SubmitButton label='Atualizar' /></form></details><form action={deleteProfessional}><input type='hidden' name='id' value={row.id} /><DeleteConfirmButton message={`Excluir o profissional ${row.full_name}?`} /></form></td></tr>)}</tbody></table></div>
      <div className='space-y-4 rounded border p-4'><h2 className='font-bold'>Agenda de atendimento</h2><form action={saveSchedule} className='grid gap-3 md:grid-cols-2'><select name='professional_id' required><option value=''>Profissional *</option>{professionalRows.map(row => <option key={row.id} value={row.id}>{row.full_name}</option>)}</select><select name='weekday' required>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input name='start_time' type='time' required /><input name='end_time' type='time' required /><input name='break_start' type='time' /><input name='break_end' type='time' /><input name='appointment_duration_minutes' type='number' min={1} defaultValue={60} /><label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked />Ativa</label><SubmitButton label='Salvar agenda' /></form><div className='space-y-2'>{(schedules as any[]).map(schedule => <div key={schedule.id} className='rounded border p-2 text-sm'><div className='font-medium'>{schedule.full_name} - {weekdays[schedule.weekday]}</div><div>{String(schedule.start_time).slice(0,5)} às {String(schedule.end_time).slice(0,5)} · {schedule.appointment_duration_minutes} min · {schedule.is_active ? 'ativa' : 'inativa'}</div><form action={deleteSchedule} className='mt-2'><input type='hidden' name='id' value={schedule.id} /><DeleteConfirmButton label='Excluir agenda' message='Excluir este horário de atendimento?' /></form></div>)}</div></div>
    </div>
  </section>
}
