import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/neon'
import { requireClinicAccess } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { AdminField, AdminFormHeader } from '../_components/premium-form'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function save(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])
  const id = optional(formData.get('id'))
  const patient = optional(formData.get('patient_id'))
  let target = '/admin/records'
  try {
    if (!patient) target += '?error=Informe+o+paciente'
    else if (id) {
      const updated = await sql`update medical_records set patient_id=${patient}::uuid,professional_id=${optional(formData.get('professional_id'))}::uuid,anamnesis=${optional(formData.get('anamnesis'))},evolution=${optional(formData.get('evolution'))},performed_procedures=${optional(formData.get('performed_procedures'))},dentist_notes=${optional(formData.get('dentist_notes'))},attachment_url=${optional(formData.get('attachment_url'))} where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id`
      target += (updated as unknown[]).length ? '?ok=Prontu%C3%A1rio+atualizado+com+sucesso' : '?error=Prontu%C3%A1rio+n%C3%A3o+encontrado'
    } else {
      await sql`insert into medical_records (clinic_id,patient_id,professional_id,anamnesis,evolution,performed_procedures,dentist_notes,attachment_url) values (${clinic.id}::uuid,${patient}::uuid,${optional(formData.get('professional_id'))}::uuid,${optional(formData.get('anamnesis'))},${optional(formData.get('evolution'))},${optional(formData.get('performed_procedures'))},${optional(formData.get('dentist_notes'))},${optional(formData.get('attachment_url'))})`
      target += '?ok=Prontu%C3%A1rio+cadastrado+com+sucesso'
    }
  } catch (error) { console.error('records.save'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+prontu%C3%A1rio' }
  revalidatePath('/admin/records'); redirect(target)
}

async function remove(formData: FormData) {
  'use server'
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])
  let target = '/admin/records'
  try {
    const id = optional(formData.get('id'))
    const deleted = id ? await sql`delete from medical_records where id=${id}::uuid and clinic_id=${clinic.id}::uuid returning id` : []
    target += (deleted as unknown[]).length ? '?ok=Prontu%C3%A1rio+exclu%C3%ADdo+com+sucesso' : '?error=Prontu%C3%A1rio+n%C3%A3o+encontrado'
  } catch (error) { console.error('records.delete'); target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir+o+prontu%C3%A1rio' }
  revalidatePath('/admin/records'); redirect(target)
}

function RecordForm({ record, patients, professionals }: { record?: any; patients: any[]; professionals: any[] }) {
  const isEditing = Boolean(record)
  return (
    <form action={save} className={`admin-form-card ${isEditing ? 'mt-3' : ''}`}>
      {isEditing ? <input type='hidden' name='id' value={record.id} /> : null}
      {!isEditing ? <AdminFormHeader title='Cadastrar prontuário' description='Registre dados clínicos do atendimento mantendo campos amplos e organizados para leitura posterior.' /> : null}
      <div className='admin-form-grid'>
        <AdminField label='Paciente' required>
          <select name='patient_id' defaultValue={record?.patient_id || ''} required>
            <option value=''>Selecione o paciente</option>
            {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
          </select>
        </AdminField>
        <AdminField label='Profissional'>
          <select name='professional_id' defaultValue={record?.professional_id || ''}>
            <option value=''>Selecione o profissional</option>
            {professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.full_name}</option>)}
          </select>
        </AdminField>
        <AdminField label='Anamnese'>
          <textarea name='anamnesis' defaultValue={record?.anamnesis || ''} placeholder='Histórico, queixas, alergias e informações relevantes' />
        </AdminField>
        <AdminField label='Evolução'>
          <textarea name='evolution' defaultValue={record?.evolution || ''} placeholder='Evolução clínica do paciente' />
        </AdminField>
        <AdminField label='Procedimentos realizados'>
          <textarea name='performed_procedures' defaultValue={record?.performed_procedures || ''} placeholder='Procedimentos realizados no atendimento' />
        </AdminField>
        <AdminField label='Notas do dentista'>
          <textarea name='dentist_notes' defaultValue={record?.dentist_notes || ''} placeholder='Observações técnicas ou recomendações internas' />
        </AdminField>
        <AdminField label='URL do anexo' className='md:col-span-2'>
          <input name='attachment_url' defaultValue={record?.attachment_url || ''} placeholder='Link do documento ou imagem anexada' />
        </AdminField>
      </div>
      <div className='admin-form-actions'><SubmitButton label={isEditing ? 'Atualizar prontuário' : 'Cadastrar prontuário'} /></div>
    </form>
  )
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])
  const params = (await searchParams) ?? {}
  const [rows, patientRows, professionalRows] = await Promise.all([
    sql`select mr.*,p.full_name patient_name,pr.full_name professional_name from medical_records mr join patients p on p.id=mr.patient_id and p.clinic_id=mr.clinic_id left join professionals pr on pr.id=mr.professional_id and pr.clinic_id=mr.clinic_id where mr.clinic_id=${clinic.id}::uuid order by mr.created_at desc limit 100`,
    sql`select id,full_name from patients where clinic_id=${clinic.id}::uuid order by full_name`,
    sql`select id,full_name from professionals where clinic_id=${clinic.id}::uuid and is_active=true order by full_name`,
  ])
  const patients = patientRows as any[]
  const professionals = professionalRows as any[]

  return <section className='space-y-6'>
    <div><h1>Prontuários</h1><p>Registros clínicos com criação, atualização e exclusão controladas por perfil.</p></div>
    <FormFeedback ok={params.ok} error={params.error} />
    <RecordForm patients={patients} professionals={professionals} />
    <div className='overflow-auto rounded border'>
      <table className='w-full min-w-[980px] text-sm'>
        <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Paciente</th><th className='p-2 text-left'>Profissional</th><th className='p-2 text-left'>Evolução</th><th className='p-2 text-left'>Ações</th></tr></thead>
        <tbody>{(rows as any[]).map(record => <tr key={record.id} className='border-t align-top'><td className='p-2 font-medium'>{record.patient_name}</td><td className='p-2'>{record.professional_name || '-'}</td><td className='p-2'>{record.evolution || '-'}</td><td className='space-y-2 p-2'><details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary><RecordForm record={record} patients={patients} professionals={professionals} /></details><form action={remove}><input type='hidden' name='id' value={record.id} /><DeleteConfirmButton message={`Excluir prontuário de ${record.patient_name}?`} /></form></td></tr>)}</tbody>
      </table>
    </div>
  </section>
}
