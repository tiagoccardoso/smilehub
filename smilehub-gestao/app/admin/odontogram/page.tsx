import { FormFeedback } from '../_components/form-feedback'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon'
import { OdontogramClient } from './odontogram-client'
import { requireClinicAccess } from '@/lib/clinic'
import { ODONTOGRAM_STATUS, TOOTH_CODES, type OdontogramEntry, type PatientOption, type ProcedureOption } from './odontogram-data'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const toothCodeSet = new Set<string>(TOOTH_CODES)
const statusSet = new Set<string>(ODONTOGRAM_STATUS.map(status => status.value))

function requiredText(formData: FormData, field: string) {
  return String(formData.get(field) || '').trim()
}

function optionalText(formData: FormData, field: string, maxLength = 1000) {
  const value = String(formData.get(field) || '').trim().slice(0, maxLength)
  return value || null
}

function optionalDate(formData: FormData, field: string) {
  const value = String(formData.get(field) || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

async function assertOdontogramAccess() {
  return requireClinicAccess(['superadmin', 'admin', 'dentist'])
}

async function saveOdontogramEntry(formData: FormData) {
  'use server'

  const { admin, clinic } = await assertOdontogramAccess()
  const patientId = requiredText(formData, 'patient_id')
  const toothCode = requiredText(formData, 'tooth_code')
  const entryId = requiredText(formData, 'entry_id')
  const status = statusSet.has(requiredText(formData, 'status')) ? requiredText(formData, 'status') : 'planned'
  const procedureId = requiredText(formData, 'procedure_id')
  const plannedProcedure = optionalText(formData, 'planned_procedure', 180)
  const notes = optionalText(formData, 'notes', 1200)
  const condition = optionalText(formData, 'condition', 120)
  const scheduledDate = optionalDate(formData, 'scheduled_date')
  let target = `/admin/odontogram?patient_id=${encodeURIComponent(patientId)}`

  try {
    if (!uuidPattern.test(patientId) || !toothCodeSet.has(toothCode) || (!plannedProcedure && !procedureId)) {
      target += '&error=Informe+paciente%2C+dente+e+procedimento+v%C3%A1lidos'
    } else {
      const patientRows = await sql`select id from patients where id = ${patientId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`
      const procedureRows = procedureId
        ? await sql`select id from procedures where id = ${procedureId}::uuid and clinic_id = ${clinic.id}::uuid and is_active = true limit 1`
        : []

      if (!(patientRows as unknown[]).length || (procedureId && !(procedureRows as unknown[]).length)) {
        target += '&error=Paciente+ou+procedimento+n%C3%A3o+encontrado'
      } else if (entryId) {
        if (!uuidPattern.test(entryId)) {
          target += '&error=Registro+do+odontograma+inv%C3%A1lido'
        } else {
          const updated = await sql`
            update odontogram_entries
               set tooth_code = ${toothCode},
                   condition = ${condition},
                   procedure_id = ${procedureId || null}::uuid,
                   planned_procedure = ${plannedProcedure},
                   notes = ${notes},
                   status = ${status},
                   scheduled_date = ${scheduledDate}
             where id = ${entryId}::uuid
               and clinic_id = ${clinic.id}::uuid
               and patient_id = ${patientId}::uuid
            returning id
          `
          target += (updated as unknown[]).length
            ? '&ok=Procedimento+do+dente+atualizado+com+sucesso'
            : '&error=Registro+n%C3%A3o+encontrado+para+este+paciente'
        }
      } else {
        await sql`
          insert into odontogram_entries (
            clinic_id,
            patient_id,
            tooth_code,
            condition,
            procedure_id,
            planned_procedure,
            notes,
            status,
            scheduled_date,
            created_by
          ) values (
            ${clinic.id}::uuid,
            ${patientId}::uuid,
            ${toothCode},
            ${condition},
            ${procedureId || null}::uuid,
            ${plannedProcedure},
            ${notes},
            ${status},
            ${scheduledDate},
            ${admin.profile.id}::uuid
          )
        `
        target += '&ok=Procedimento+do+dente+salvo+com+sucesso'
      }
    }
  } catch (error) {
    console.error('odontogram.save')
    target += '&error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+procedimento.+Verifique+os+dados+e+tente+novamente'
  }

  revalidatePath('/admin/odontogram')
  redirect(target)
}

async function deleteOdontogramEntry(formData: FormData) {
  'use server'

  const { clinic } = await assertOdontogramAccess()
  const patientId = requiredText(formData, 'patient_id')
  const entryId = requiredText(formData, 'entry_id')
  let target = `/admin/odontogram${patientId ? `?patient_id=${encodeURIComponent(patientId)}` : ''}`

  try {
    if (!uuidPattern.test(patientId) || !uuidPattern.test(entryId)) {
      target += `${target.includes('?') ? '&' : '?'}error=Registro+inv%C3%A1lido+para+remo%C3%A7%C3%A3o`
    } else {
      const deleted = await sql`delete from odontogram_entries where id = ${entryId}::uuid and clinic_id = ${clinic.id}::uuid and patient_id = ${patientId}::uuid returning id`
      target += (deleted as unknown[]).length
        ? '&ok=Procedimento+removido+do+dente+com+sucesso'
        : '&error=Registro+n%C3%A3o+encontrado+para+este+paciente'
    }
  } catch (error) {
    console.error('odontogram.delete')
    target += `${target.includes('?') ? '&' : '?'}error=N%C3%A3o+foi+poss%C3%ADvel+remover+o+procedimento`
  }

  revalidatePath('/admin/odontogram')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await assertOdontogramAccess()
  const params = (await searchParams) ?? {}
  const selectedPatientId = uuidPattern.test(params.patient_id || '') ? params.patient_id : ''

  const [entries, patients, procedures] = await Promise.all([
    sql`
      select
        o.id,
        o.patient_id,
        p.full_name as patient_name,
        o.tooth_code,
        o.condition,
        o.procedure_id,
        pr.name as procedure_name,
        o.planned_procedure,
        o.performed_procedure,
        o.notes,
        coalesce(o.status, 'planned') as status,
        o.scheduled_date,
        o.created_at,
        o.updated_at
      from odontogram_entries o
      join patients p on p.id = o.patient_id and p.clinic_id = o.clinic_id
      left join procedures pr on pr.id = o.procedure_id and pr.clinic_id = o.clinic_id
      where o.clinic_id = ${clinic.id}::uuid and (${selectedPatientId || null}::uuid is null or o.patient_id = ${selectedPatientId || null}::uuid)
      order by o.updated_at desc, o.created_at desc
      limit 200
    `,
    sql`select id, full_name from patients where clinic_id = ${clinic.id}::uuid and status = 'active' order by full_name`,
    sql`select id, name from procedures where clinic_id = ${clinic.id}::uuid and is_active = true order by name`,
  ])

  return (
    <section className='space-y-6'>
      <div className='space-y-2'>
        <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Mapa clínico do paciente</p>
        <h1 className='text-2xl font-bold'>Odontograma</h1>
        <p className='max-w-3xl text-sm text-gray-600'>
          Selecione um paciente, clique diretamente no dente desejado e registre o procedimento planejado. Dentes com registros aparecem destacados no mapa.
        </p>
      </div>
      <FormFeedback ok={params.ok} error={params.error} />
      <OdontogramClient
        patients={patients as PatientOption[]}
        procedures={procedures as ProcedureOption[]}
        entries={entries as OdontogramEntry[]}
        selectedPatientId={selectedPatientId}
        saveAction={saveOdontogramEntry}
        deleteAction={deleteOdontogramEntry}
      />
    </section>
  )
}
