import { sql } from '@/lib/neon'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireClinicAccess } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { AdminCheckboxField, AdminField, AdminFormHeader } from '../_components/premium-form'

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

function ProfessionalForm({ professional }: { professional?: any }) {
  const isEditing = Boolean(professional)
  return (
    <form action={saveProfessional} className={`admin-form-card ${isEditing ? 'mt-3' : ''}`}>
      {isEditing ? <input type='hidden' name='id' value={professional.id} /> : null}
      {!isEditing ? <AdminFormHeader title='Cadastrar profissional' description='Informe os dados principais do profissional e mantenha o status ativo quando ele puder atender na agenda.' /> : null}
      <div className='admin-form-grid'>
        <AdminField label='Nome completo' required>
          <input name='full_name' defaultValue={professional?.full_name || ''} required placeholder='Nome do profissional' />
        </AdminField>
        <AdminField label='Especialidade'>
          <input name='specialty' defaultValue={professional?.specialty || ''} placeholder='Ex.: Ortodontia' />
        </AdminField>
        <AdminField label='CRO'>
          <input name='cro' defaultValue={professional?.cro || ''} placeholder='Registro profissional' />
        </AdminField>
        <AdminCheckboxField className='self-end'>
          <input type='checkbox' name='is_active' defaultChecked={professional?.is_active ?? true} />
          Ativo
        </AdminCheckboxField>
        <AdminField label='Observações da agenda' className='md:col-span-2'>
          <textarea name='schedule_notes' defaultValue={professional?.schedule_notes || ''} placeholder='Preferências, restrições ou orientações internas' />
        </AdminField>
      </div>
      <div className='admin-form-actions'>
        <SubmitButton label={isEditing ? 'Atualizar profissional' : 'Cadastrar profissional'} />
      </div>
    </form>
  )
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
    <div><h1>Profissionais</h1><p>Cadastro de profissionais e configuração de horários de atendimento.</p></div>
    <FormFeedback ok={params.ok} error={params.error} />
    <ProfessionalForm />

    <div className='grid gap-6 lg:grid-cols-2'>
      <div className='overflow-auto rounded border'>
        <table className='w-full min-w-[760px] text-sm'>
          <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Nome</th><th className='p-2 text-left'>Especialidade</th><th className='p-2 text-left'>CRO</th><th className='p-2 text-left'>Ações</th></tr></thead>
          <tbody>{professionalRows.map(row => <tr key={row.id} className='border-t align-top'><td className='p-2 font-medium'>{row.full_name}</td><td className='p-2'>{row.specialty || '-'}</td><td className='p-2'>{row.cro || '-'}</td><td className='space-y-2 p-2'><details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary><ProfessionalForm professional={row} /></details><form action={deleteProfessional}><input type='hidden' name='id' value={row.id} /><DeleteConfirmButton message={`Excluir o profissional ${row.full_name}?`} /></form></td></tr>)}</tbody>
        </table>
      </div>

      <div className='space-y-4 rounded border bg-white p-4'>
        <AdminFormHeader title='Agenda de atendimento' description='Defina o dia da semana, horários de atendimento, intervalo e duração padrão da consulta.' />
        <form action={saveSchedule} className='admin-form-card shadow-none'>
          <div className='admin-form-grid'>
            <AdminField label='Profissional' required>
              <select name='professional_id' required><option value=''>Selecione</option>{professionalRows.map(row => <option key={row.id} value={row.id}>{row.full_name}</option>)}</select>
            </AdminField>
            <AdminField label='Dia da semana' required>
              <select name='weekday' required>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>
            </AdminField>
            <AdminField label='Início' required><input name='start_time' type='time' required /></AdminField>
            <AdminField label='Fim' required><input name='end_time' type='time' required /></AdminField>
            <AdminField label='Início do intervalo'><input name='break_start' type='time' /></AdminField>
            <AdminField label='Fim do intervalo'><input name='break_end' type='time' /></AdminField>
            <AdminField label='Duração padrão'><input name='appointment_duration_minutes' type='number' min={1} defaultValue={60} /></AdminField>
            <AdminCheckboxField className='self-end'><input type='checkbox' name='is_active' defaultChecked />Ativa</AdminCheckboxField>
          </div>
          <div className='admin-form-actions'><SubmitButton label='Salvar agenda' /></div>
        </form>
        <div className='space-y-2'>{(schedules as any[]).map(schedule => <div key={schedule.id} className='rounded-2xl border border-slate-200 p-3 text-sm'><div className='font-medium'>{schedule.full_name} - {weekdays[schedule.weekday]}</div><div>{String(schedule.start_time).slice(0,5)} às {String(schedule.end_time).slice(0,5)} · {schedule.appointment_duration_minutes} min · {schedule.is_active ? 'ativa' : 'inativa'}</div><form action={deleteSchedule} className='mt-2'><input type='hidden' name='id' value={schedule.id} /><DeleteConfirmButton label='Excluir agenda' message='Excluir este horário de atendimento?' /></form></div>)}</div>
      </div>
    </div>
  </section>
}
