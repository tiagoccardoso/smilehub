import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/neon'
import { appointmentStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function saveAppointment(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist', 'reception'])

  const id = optional(formData.get('id'))
  const patientId = optional(formData.get('patient_id'))
  const appointmentDate = optional(formData.get('appointment_date'))
  const startTime = optional(formData.get('start_time'))
  const endTime = optional(formData.get('end_time'))
  let target = '/admin/agenda'

  try {
    if (!patientId || !appointmentDate || !startTime || !endTime) {
      target += '?error=Informe+paciente%2C+data+e+hor%C3%A1rios'
    } else if (id) {
      const updated = await sql`
        update appointments
           set patient_id = ${patientId}::uuid,
               professional_id = ${optional(formData.get('professional_id'))}::uuid,
               procedure_id = ${optional(formData.get('procedure_id'))}::uuid,
               notes = ${optional(formData.get('notes'))},
               appointment_date = ${appointmentDate},
               start_time = ${startTime},
               end_time = ${endTime},
               status = ${String(formData.get('status') || 'scheduled')}::appointment_status
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `
      target += (updated as unknown[]).length ? '?ok=Agendamento+atualizado+com+sucesso' : '?error=Agendamento+n%C3%A3o+encontrado'
    } else {
      await sql`
        insert into appointments (clinic_id, patient_id, professional_id, procedure_id, notes, appointment_date, start_time, end_time, status)
        values (${clinic.id}::uuid, ${patientId}::uuid, ${optional(formData.get('professional_id'))}::uuid, ${optional(formData.get('procedure_id'))}::uuid, ${optional(formData.get('notes'))}, ${appointmentDate}, ${startTime}, ${endTime}, ${String(formData.get('status') || 'scheduled')}::appointment_status)
      `
      target += '?ok=Agendamento+criado+com+sucesso'
    }
  } catch (error) {
    console.error('agenda.save', error)
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar.+Verifique+hor%C3%A1rios+e+v%C3%ADnculos'
  }

  revalidatePath('/admin/agenda')
  redirect(target)
}

async function deleteAppointment(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist', 'reception'])

  let target = '/admin/agenda'
  try {
    const id = optional(formData.get('id'))
    if (!id) {
      target += '?error=Agendamento+inv%C3%A1lido'
    } else {
      const deleted = await sql`delete from appointments where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id`
      target += (deleted as unknown[]).length ? '?ok=Agendamento+exclu%C3%ADdo+com+sucesso' : '?error=Agendamento+n%C3%A3o+encontrado'
    }
  } catch (error) {
    console.error('agenda.delete', error)
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+agendamento'
  }

  revalidatePath('/admin/agenda')
  redirect(target)
}

type AgendaPageData = {
  rows: any[]
  patientOptions: any[]
  professionalOptions: any[]
  procedureOptions: any[]
  loadError?: string
}

async function loadAgendaData(clinicId: string): Promise<AgendaPageData> {
  try {
    const [rows, patients, professionals, procedures] = await Promise.all([
      sql`
        select a.*, p.full_name as patient_name, pr.full_name as professional_name, proc.name as procedure_name
          from appointments a
          join patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id
          left join professionals pr on pr.id = a.professional_id and pr.clinic_id = a.clinic_id
          left join procedures proc on proc.id = a.procedure_id and proc.clinic_id = a.clinic_id
         where a.clinic_id = ${clinicId}::uuid
         order by a.appointment_date desc, a.start_time desc
         limit 100
      `,
      sql`select id, full_name from patients where clinic_id = ${clinicId}::uuid order by full_name`,
      sql`select id, full_name from professionals where clinic_id = ${clinicId}::uuid and is_active = true order by full_name`,
      sql`select id, name from procedures where clinic_id = ${clinicId}::uuid and is_active = true order by name`,
    ])

    return {
      rows: rows as any[],
      patientOptions: patients as any[],
      professionalOptions: professionals as any[],
      procedureOptions: procedures as any[],
    }
  } catch (error) {
    console.error('agenda.load', error)

    return {
      rows: [],
      patientOptions: [],
      professionalOptions: [],
      procedureOptions: [],
      loadError:
        'A rota /admin/agenda existe, mas não conseguiu carregar os dados. Verifique se a variável DATABASE_URL está configurada e se as migrations das tabelas patients, professionals, procedures e appointments foram aplicadas no Neon.',
    }
  }
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist', 'reception'])

  const params = (await searchParams) ?? {}
  const { rows, patientOptions, professionalOptions, procedureOptions, loadError } = await loadAgendaData(clinic.id)
  const canCreateAppointment = !loadError && patientOptions.length > 0

  return (
    <section className='space-y-6'>
      <div><h1 className='text-2xl font-bold'>Agenda</h1><p className='text-sm text-gray-600'>Rota administrativa /admin/agenda ativa para criar, editar, atualizar e excluir agendamentos.</p></div>
      <FormFeedback ok={getParam(params, 'ok')} error={getParam(params, 'error')} />
      {loadError && (
        <div className='rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
          <p className='font-semibold'>Agenda encontrada, mas os dados não foram carregados.</p>
          <p className='mt-1'>{loadError}</p>
        </div>
      )}
      {!loadError && patientOptions.length === 0 && (
        <p className='rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900'>Cadastre pelo menos um paciente para criar agendamentos.</p>
      )}
      <form action={saveAppointment} className='grid gap-3 rounded border bg-white p-4 md:grid-cols-2'>
        <select name='patient_id' required disabled={!canCreateAppointment}><option value=''>Paciente *</option>{patientOptions.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select>
        <select name='professional_id' disabled={!!loadError}><option value=''>Profissional</option>{professionalOptions.map(professional => <option key={professional.id} value={professional.id}>{professional.full_name}</option>)}</select>
        <select name='procedure_id' disabled={!!loadError}><option value=''>Procedimento</option>{procedureOptions.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}</select>
        <select name='status' disabled={!!loadError}>{appointmentStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        <input name='appointment_date' type='date' required disabled={!canCreateAppointment} />
        <input name='start_time' type='time' required disabled={!canCreateAppointment} />
        <input name='end_time' type='time' required disabled={!canCreateAppointment} />
        <textarea name='notes' className='md:col-span-2' placeholder='Observações' disabled={!!loadError} />
        {canCreateAppointment ? <SubmitButton label='Criar agendamento' /> : <button className='btn opacity-60' type='button' disabled>Criar agendamento</button>}
      </form>
      <div className='overflow-auto rounded border'>
        <table className='w-full min-w-[1000px] text-sm'>
          <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Paciente</th><th className='p-2 text-left'>Profissional</th><th className='p-2 text-left'>Procedimento</th><th className='p-2 text-left'>Data/Hora</th><th className='p-2 text-left'>Status</th><th className='p-2 text-left'>Ações</th></tr></thead>
          <tbody>{(rows as any[]).map(row => (
            <tr key={row.id} className='border-t align-top'>
              <td className='p-2 font-medium'>{row.patient_name}</td><td className='p-2'>{row.professional_name || '-'}</td><td className='p-2'>{row.procedure_name || '-'}</td><td className='p-2'>{row.appointment_date} {String(row.start_time).slice(0, 5)}-{String(row.end_time).slice(0, 5)}</td><td className='p-2'>{statusLabel(row.status)}</td>
              <td className='space-y-2 p-2'>
                <details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary>
                  <form action={saveAppointment} className='mt-3 grid gap-2 md:grid-cols-2'>
                    <input type='hidden' name='id' value={row.id} />
                    <select name='patient_id' defaultValue={row.patient_id} required>{patientOptions.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select>
                    <select name='professional_id' defaultValue={row.professional_id || ''}><option value=''>Profissional</option>{professionalOptions.map(professional => <option key={professional.id} value={professional.id}>{professional.full_name}</option>)}</select>
                    <select name='procedure_id' defaultValue={row.procedure_id || ''}><option value=''>Procedimento</option>{procedureOptions.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}</select>
                    <select name='status' defaultValue={row.status}>{appointmentStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                    <input name='appointment_date' type='date' defaultValue={row.appointment_date} required />
                    <input name='start_time' type='time' defaultValue={String(row.start_time).slice(0, 5)} required />
                    <input name='end_time' type='time' defaultValue={String(row.end_time).slice(0, 5)} required />
                    <textarea name='notes' className='md:col-span-2' defaultValue={row.notes || ''} placeholder='Observações' />
                    <SubmitButton label='Atualizar' />
                  </form>
                </details>
                <form action={deleteAppointment}><input type='hidden' name='id' value={row.id} /><DeleteConfirmButton message={`Excluir o agendamento de ${row.patient_name}?`} /></form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}
