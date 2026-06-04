import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon'
import { revalidatePath } from 'next/cache'
import { patientStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { formatCpf, isValidCpf, normalizeOptionalCpf } from '@/lib/cpf'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { CpfInput } from './cpf-input'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function savePatient(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess()
  const id = optional(formData.get('id'))
  const fullName = optional(formData.get('full_name'))
  const phone = optional(formData.get('phone'))
  const cpf = normalizeOptionalCpf(optional(formData.get('cpf')))
  let target = '/admin/patients'

  try {
    if (!fullName || !phone) {
      target += '?error=Informe+nome+completo+e+telefone'
    } else if (cpf && !isValidCpf(cpf)) {
      target += '?error=CPF+inv%C3%A1lido.+Confira+os+d%C3%ADgitos+informados'
    } else if (id) {
      const updated = await sql`
        update patients
           set full_name = ${fullName},
               phone = ${phone},
               cpf = ${cpf},
               birth_date = ${optional(formData.get('birth_date'))},
               email = ${optional(formData.get('email'))},
               address = ${optional(formData.get('address'))},
               guardian_name = ${optional(formData.get('guardian_name'))},
               notes = ${optional(formData.get('notes'))},
               status = ${String(formData.get('status') || 'active')}::patient_status
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `
      target += (updated as unknown[]).length ? '?ok=Paciente+atualizado+com+sucesso' : '?error=Paciente+n%C3%A3o+encontrado'
    } else {
      await sql`
        insert into patients (clinic_id, full_name, phone, cpf, birth_date, email, address, guardian_name, notes, status)
        values (${clinic.id}::uuid, ${fullName}, ${phone}, ${cpf}, ${optional(formData.get('birth_date'))}, ${optional(formData.get('email'))}, ${optional(formData.get('address'))}, ${optional(formData.get('guardian_name'))}, ${optional(formData.get('notes'))}, ${String(formData.get('status') || 'active')}::patient_status)
      `
      target += '?ok=Paciente+cadastrado+com+sucesso'
    }
  } catch (error) {
    console.error('patients.save')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+paciente.+Verifique+os+dados'
  }

  revalidatePath('/admin/patients')
  redirect(target)
}

async function deletePatient(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess()
  let target = '/admin/patients'
  try {
    const id = optional(formData.get('id'))
    if (!id) {
      target += '?error=Paciente+inv%C3%A1lido'
    } else {
      const deleted = await sql`delete from patients where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id`
      target += (deleted as unknown[]).length ? '?ok=Paciente+exclu%C3%ADdo+com+sucesso' : '?error=Paciente+n%C3%A3o+encontrado'
    }
  } catch (error) {
    console.error('patients.delete')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir.+Verifique+se+n%C3%A3o+h%C3%A1+v%C3%ADnculos'
  }

  revalidatePath('/admin/patients')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess()
  const params = (await searchParams) ?? {}
  const patients = await sql`select * from patients where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`

  return (
    <section className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Pacientes</h1>
        <p className='text-sm text-gray-600'>Cadastre, edite, atualize e exclua pacientes da clínica. Campos marcados com <strong className='text-red-600'>*</strong> são obrigatórios.</p>
      </div>
      <FormFeedback ok={params.ok} error={params.error} />
      <form action={savePatient} className='grid gap-3 rounded border bg-white p-4 md:grid-cols-2'>
        <label>Nome completo <strong className='required-mark'>*</strong><input name='full_name' placeholder='Nome completo' required /></label>
        <label>Telefone <strong className='required-mark'>*</strong><input name='phone' placeholder='Telefone' required /></label>
        <CpfInput />
        <label>Data de nascimento<input name='birth_date' type='date' /></label>
        <label>E-mail<input name='email' type='email' placeholder='E-mail' /></label>
        <label>Responsável<input name='guardian_name' placeholder='Responsável' /></label>
        <label className='md:col-span-2'>Endereço<input name='address' placeholder='Endereço' /></label>
        <label className='md:col-span-2'>Observações<textarea name='notes' placeholder='Observações' /></label>
        <label>Status<select name='status'>{patientStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        <SubmitButton label='Cadastrar paciente' />
      </form>
      <div className='overflow-auto rounded border'>
        <table className='w-full min-w-[1080px] text-sm'>
          <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Nome</th><th className='p-2 text-left'>Telefone</th><th className='p-2 text-left'>CPF</th><th className='p-2 text-left'>E-mail</th><th className='p-2 text-left'>Status</th><th className='p-2 text-left'>Ações</th></tr></thead>
          <tbody>
            {(patients as any[]).map(patient => (
              <tr key={patient.id} className='border-t align-top'>
                <td className='p-2 font-medium'>{patient.full_name}</td>
                <td className='p-2'>{patient.phone}</td>
                <td className='p-2'>{patient.cpf ? formatCpf(patient.cpf) : '-'}</td>
                <td className='p-2'>{patient.email || '-'}</td>
                <td className='p-2'>{statusLabel(patient.status)}</td>
                <td className='space-y-2 p-2'>
                  <details className='rounded border p-2'>
                    <summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary>
                    <form action={savePatient} className='mt-3 grid gap-2 md:grid-cols-2'>
                      <input type='hidden' name='id' value={patient.id} />
                      <label>Nome completo <strong className='required-mark'>*</strong><input name='full_name' defaultValue={patient.full_name} required /></label>
                      <label>Telefone <strong className='required-mark'>*</strong><input name='phone' defaultValue={patient.phone} required /></label>
                      <CpfInput defaultValue={patient.cpf || ''} />
                      <label>Data de nascimento<input name='birth_date' type='date' defaultValue={patient.birth_date || ''} /></label>
                      <label>E-mail<input name='email' type='email' defaultValue={patient.email || ''} placeholder='E-mail' /></label>
                      <label>Responsável<input name='guardian_name' defaultValue={patient.guardian_name || ''} placeholder='Responsável' /></label>
                      <label className='md:col-span-2'>Endereço<input name='address' defaultValue={patient.address || ''} placeholder='Endereço' /></label>
                      <label className='md:col-span-2'>Observações<textarea name='notes' defaultValue={patient.notes || ''} placeholder='Observações' /></label>
                      <label>Status<select name='status' defaultValue={patient.status}>{patientStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                      <SubmitButton label='Atualizar' />
                    </form>
                  </details>
                  <form action={deletePatient}>
                    <input type='hidden' name='id' value={patient.id} />
                    <DeleteConfirmButton message={`Excluir o paciente ${patient.full_name}?`} />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
