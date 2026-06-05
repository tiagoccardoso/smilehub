import { FormFeedback } from '../_components/form-feedback'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon'
import { OdontogramClient } from './odontogram-client'
import { requireClinicAccess } from '@/lib/clinic'
import { ODONTOGRAM_CHARTS, ODONTOGRAM_STATUS, TOOTH_CODES, type OdontogramChartId, type OdontogramEntry, type OdontogramTerm, type PatientOption, type ProcedureOption } from './odontogram-data'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const toothCodeSet = new Set<string>(TOOTH_CODES)
const chartIdSet = new Set<string>(ODONTOGRAM_CHARTS.map(chart => chart.id))
const statusSet = new Set<string>(ODONTOGRAM_STATUS.map(status => status.value))

function chartToothCodes(chartType: string) {
  return ODONTOGRAM_CHARTS.find(chart => chart.id === chartType)?.teeth.map(tooth => tooth.number) ?? ODONTOGRAM_CHARTS[0].teeth.map(tooth => tooth.number)
}

function pgArrayLiteral(values: string[]) {
  if (!values.length) return '{}'
  return `{${values.map(value => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`
}

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
  const chartType = chartIdSet.has(requiredText(formData, 'chart_type')) ? requiredText(formData, 'chart_type') : 'adult'
  const procedureId = requiredText(formData, 'procedure_id')
  const plannedProcedure = optionalText(formData, 'planned_procedure', 180)
  const notes = optionalText(formData, 'notes', 1200)
  const condition = optionalText(formData, 'condition', 120)
  const scheduledDate = optionalDate(formData, 'scheduled_date')
  let target = `/admin/odontogram?patient_id=${encodeURIComponent(patientId)}&tab=${encodeURIComponent(chartType)}`

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
  const chartType = chartIdSet.has(requiredText(formData, 'chart_type')) ? requiredText(formData, 'chart_type') : 'adult'
  let target = `/admin/odontogram${patientId ? `?patient_id=${encodeURIComponent(patientId)}&tab=${encodeURIComponent(chartType)}` : `?tab=${encodeURIComponent(chartType)}`}`

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

async function saveResponsibilityTerm(formData: FormData) {
  'use server'

  const { admin, clinic } = await assertOdontogramAccess()
  const patientId = requiredText(formData, 'patient_id')
  const chartType = chartIdSet.has(requiredText(formData, 'chart_type')) ? requiredText(formData, 'chart_type') : 'adult'
  const termId = requiredText(formData, 'term_id')
  const saveMode = requiredText(formData, 'save_mode')
  const childName = optionalText(formData, 'child_name', 120)
  const birthOrAge = optionalText(formData, 'birth_or_age', 80)
  const guardianName = optionalText(formData, 'guardian_name', 120)
  const guardianDocument = optionalText(formData, 'guardian_document', 60)
  const guardianPhone = optionalText(formData, 'guardian_phone', 40)
  const relationship = optionalText(formData, 'relationship', 80)
  const authorizationDate = optionalDate(formData, 'authorization_date')
  const professionalName = optionalText(formData, 'professional_name', 160)
  const authorizedProcedures = optionalText(formData, 'authorized_procedures', 3000)
  const termText = optionalText(formData, 'term_text', 8000)
  const signatureDataUrl = optionalText(formData, 'signature_data_url', 900000)
  let target = `/admin/odontogram?patient_id=${encodeURIComponent(patientId)}&tab=${encodeURIComponent(chartType)}`

  try {
    if (!uuidPattern.test(patientId)) {
      target += '&error=Selecione+um+paciente+v%C3%A1lido+antes+de+salvar+o+termo'
    } else if (signatureDataUrl && !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(signatureDataUrl)) {
      target += '&error=Assinatura+digital+em+formato+inv%C3%A1lido'
    } else {
      const patientRows = await sql`
        select id, full_name, cpf, birth_date, phone, email, address, guardian_name
          from patients
         where id = ${patientId}::uuid and clinic_id = ${clinic.id}::uuid
         limit 1
      `
      const patient = (patientRows as {
        id: string
        full_name: string
        cpf: string | null
        birth_date: string | null
        phone: string | null
        email: string | null
        address: string | null
        guardian_name: string | null
      }[])[0]

      if (!patient) {
        target += '&error=Paciente+n%C3%A3o+encontrado+para+este+consult%C3%B3rio'
      } else {
        const activeToothSet = new Set<string>(chartToothCodes(chartType))
        const entryRows = await sql`
          select
            o.id,
            o.tooth_code,
            o.condition,
            o.planned_procedure,
            o.performed_procedure,
            o.notes,
            coalesce(o.status, 'planned') as status,
            o.scheduled_date,
            pr.name as procedure_name,
            coalesce(u.name, u.email) as created_by_name,
            o.created_at,
            o.updated_at
          from odontogram_entries o
          left join procedures pr on pr.id = o.procedure_id and pr.clinic_id = o.clinic_id
          left join public."user" u on u.id = o.created_by
          where o.clinic_id = ${clinic.id}::uuid and o.patient_id = ${patientId}::uuid
          order by o.updated_at desc, o.created_at desc
          limit 1000
        `
        const relatedEntries = (entryRows as {
          id: string
          tooth_code: string
          condition: string | null
          planned_procedure: string | null
          performed_procedure: string | null
          notes: string | null
          status: string
          scheduled_date: string | null
          procedure_name: string | null
          created_by_name: string | null
          created_at: string
          updated_at: string
        }[]).filter(entry => activeToothSet.has(entry.tooth_code))
        const entryIds = relatedEntries.map(entry => entry.id).filter(id => uuidPattern.test(id))
        const relatedTeeth = [...new Set(relatedEntries.map(entry => entry.tooth_code).filter(Boolean))]
        const guardianData = {
          childName,
          birthOrAge,
          guardianName,
          guardianDocument,
          guardianPhone,
          relationship,
        }
        const patientSnapshot = {
          id: patient.id,
          fullName: patient.full_name,
          cpf: patient.cpf,
          birthDate: patient.birth_date,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          guardianName: patient.guardian_name,
        }
        const proceduresSnapshot = relatedEntries.map(entry => ({
          id: entry.id,
          toothCode: entry.tooth_code,
          procedure: entry.procedure_name || entry.planned_procedure || entry.performed_procedure || 'Procedimento sem descrição',
          condition: entry.condition,
          status: entry.status,
          scheduledDate: entry.scheduled_date,
          notes: entry.notes,
          createdByName: entry.created_by_name,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
        }))
        const status = signatureDataUrl ? 'signed' : 'draft'
        let savedRows: { id: string }[] = []

        if (saveMode === 'update' && uuidPattern.test(termId)) {
          savedRows = (await sql`
            update odontogram_terms
               set chart_type = ${chartType},
                   odontogram_entry_ids = ${pgArrayLiteral(entryIds)}::uuid[],
                   guardian_data = ${JSON.stringify(guardianData)}::jsonb,
                   patient_snapshot = ${JSON.stringify(patientSnapshot)}::jsonb,
                   procedures_snapshot = ${JSON.stringify(proceduresSnapshot)}::jsonb,
                   child_name = ${childName},
                   birth_or_age = ${birthOrAge},
                   guardian_name = ${guardianName},
                   guardian_document = ${guardianDocument},
                   guardian_phone = ${guardianPhone},
                   relationship = ${relationship},
                   authorization_date = ${authorizationDate},
                   professional_name = ${professionalName},
                   authorized_procedures = ${authorizedProcedures},
                   term_text = ${termText},
                   related_teeth = ${pgArrayLiteral(relatedTeeth)}::text[],
                   signature_data_url = ${signatureDataUrl},
                   status = ${status},
                   updated_by = ${admin.profile.id}::uuid
             where id = ${termId}::uuid
               and clinic_id = ${clinic.id}::uuid
               and patient_id = ${patientId}::uuid
             returning id
          `) as { id: string }[]
        } else {
          let parentTermId: string | null = null
          let version = 1

          if (saveMode === 'new_version' && uuidPattern.test(termId)) {
            const parentRows = await sql`
              select coalesce(parent_term_id, id) as root_id
                from odontogram_terms
               where id = ${termId}::uuid and clinic_id = ${clinic.id}::uuid and patient_id = ${patientId}::uuid
               limit 1
            `
            const parent = (parentRows as { root_id: string }[])[0]
            if (parent?.root_id && uuidPattern.test(parent.root_id)) {
              parentTermId = parent.root_id
              const versionRows = await sql`
                select coalesce(max(version), 0) + 1 as next_version
                  from odontogram_terms
                 where clinic_id = ${clinic.id}::uuid
                   and patient_id = ${patientId}::uuid
                   and (id = ${parentTermId}::uuid or parent_term_id = ${parentTermId}::uuid)
              `
              version = Number((versionRows as { next_version: number }[])[0]?.next_version || 1)
            }
          }

          savedRows = (await sql`
            insert into odontogram_terms (
              clinic_id,
              patient_id,
              chart_type,
              odontogram_entry_ids,
              guardian_data,
              patient_snapshot,
              procedures_snapshot,
              child_name,
              birth_or_age,
              guardian_name,
              guardian_document,
              guardian_phone,
              relationship,
              authorization_date,
              professional_name,
              authorized_procedures,
              term_text,
              related_teeth,
              signature_data_url,
              status,
              version,
              parent_term_id,
              created_by,
              updated_by
            ) values (
              ${clinic.id}::uuid,
              ${patientId}::uuid,
              ${chartType},
              ${pgArrayLiteral(entryIds)}::uuid[],
              ${JSON.stringify(guardianData)}::jsonb,
              ${JSON.stringify(patientSnapshot)}::jsonb,
              ${JSON.stringify(proceduresSnapshot)}::jsonb,
              ${childName},
              ${birthOrAge},
              ${guardianName},
              ${guardianDocument},
              ${guardianPhone},
              ${relationship},
              ${authorizationDate},
              ${professionalName},
              ${authorizedProcedures},
              ${termText},
              ${pgArrayLiteral(relatedTeeth)}::text[],
              ${signatureDataUrl},
              ${status},
              ${version},
              ${parentTermId || null}::uuid,
              ${admin.profile.id}::uuid,
              ${admin.profile.id}::uuid
            )
            returning id
          `) as { id: string }[]
        }

        const savedId = savedRows[0]?.id
        target += savedId
          ? `&term_id=${encodeURIComponent(savedId)}&ok=Termo+salvo+com+sucesso`
          : '&error=Termo+n%C3%A3o+encontrado+para+atualiza%C3%A7%C3%A3o'
      }
    }
  } catch (error) {
    console.error('odontogram.term.save')
    target += '&error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+termo.+Verifique+se+a+migration+foi+executada'
  }

  revalidatePath('/admin/odontogram')
  redirect(target)
}

async function deleteResponsibilityTerm(formData: FormData) {
  'use server'

  const { clinic } = await assertOdontogramAccess()
  const patientId = requiredText(formData, 'patient_id')
  const chartType = chartIdSet.has(requiredText(formData, 'chart_type')) ? requiredText(formData, 'chart_type') : 'adult'
  const termId = requiredText(formData, 'term_id')
  let target = `/admin/odontogram${patientId ? `?patient_id=${encodeURIComponent(patientId)}&tab=${encodeURIComponent(chartType)}` : `?tab=${encodeURIComponent(chartType)}`}`

  try {
    if (!uuidPattern.test(patientId) || !uuidPattern.test(termId)) {
      target += `${target.includes('?') ? '&' : '?'}error=Termo+inv%C3%A1lido+para+exclus%C3%A3o`
    } else {
      const deleted = await sql`
        delete from odontogram_terms
         where id = ${termId}::uuid
           and clinic_id = ${clinic.id}::uuid
           and patient_id = ${patientId}::uuid
        returning id
      `
      target += (deleted as unknown[]).length
        ? '&ok=Termo+exclu%C3%ADdo+com+sucesso'
        : '&error=Termo+n%C3%A3o+encontrado+para+este+paciente'
    }
  } catch (error) {
    console.error('odontogram.term.delete')
    target += `${target.includes('?') ? '&' : '?'}error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+termo`
  }

  revalidatePath('/admin/odontogram')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await assertOdontogramAccess()
  const params = (await searchParams) ?? {}
  const selectedPatientId = uuidPattern.test(params.patient_id || '') ? params.patient_id : ''
  const initialTab = (chartIdSet.has(params.tab || '') ? params.tab : 'adult') as OdontogramChartId
  const initialTermId = uuidPattern.test(params.term_id || '') ? params.term_id : ''

  const [entries, patients, procedures, terms] = await Promise.all([
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
        coalesce(u.name, u.email) as created_by_name,
        o.created_at,
        o.updated_at
      from odontogram_entries o
      join patients p on p.id = o.patient_id and p.clinic_id = o.clinic_id
      left join procedures pr on pr.id = o.procedure_id and pr.clinic_id = o.clinic_id
      left join public."user" u on u.id = o.created_by
      where o.clinic_id = ${clinic.id}::uuid and (${selectedPatientId || null}::uuid is null or o.patient_id = ${selectedPatientId || null}::uuid)
      order by o.updated_at desc, o.created_at desc
      limit 1000
    `,
    sql`select id, full_name, cpf, birth_date, phone, email, address, guardian_name from patients where clinic_id = ${clinic.id}::uuid and status = 'active' order by full_name`,
    sql`select id, name from procedures where clinic_id = ${clinic.id}::uuid and is_active = true order by name`,
    sql`
      select
        t.id,
        t.patient_id,
        p.full_name as patient_name,
        t.chart_type,
        t.child_name,
        t.birth_or_age,
        t.guardian_name,
        t.guardian_document,
        t.guardian_phone,
        t.relationship,
        t.authorization_date,
        t.professional_name,
        t.authorized_procedures,
        t.term_text,
        t.related_teeth,
        t.signature_data_url,
        coalesce(t.status, 'draft') as status,
        coalesce(t.version, 1) as version,
        t.parent_term_id,
        coalesce(created_user.name, created_user.email) as created_by_name,
        coalesce(updated_user.name, updated_user.email) as updated_by_name,
        t.created_at,
        t.updated_at
      from odontogram_terms t
      join patients p on p.id = t.patient_id and p.clinic_id = t.clinic_id
      left join public."user" created_user on created_user.id = t.created_by
      left join public."user" updated_user on updated_user.id = t.updated_by
      where t.clinic_id = ${clinic.id}::uuid and (${selectedPatientId || null}::uuid is null or t.patient_id = ${selectedPatientId || null}::uuid)
      order by t.updated_at desc, t.created_at desc
      limit 100
    `,
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
        initialTab={initialTab}
        saveAction={saveOdontogramEntry}
        deleteAction={deleteOdontogramEntry}
        terms={terms as OdontogramTerm[]}
        initialTermId={initialTermId}
        saveTermAction={saveResponsibilityTerm}
        deleteTermAction={deleteResponsibilityTerm}
      />
    </section>
  )
}
