import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon'
import { revalidatePath } from 'next/cache'
import { patientStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

async function savePatient(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess()
  const id = optional(formData.get('id'))
  const fullName = optional(formData.get('full_name'))
  const phone = optional(formData.get('phone'))
  let target = '/admin/patients'

  try {
    if (!fullName || !phone) {
      target += '?error=Informe+nome+completo+e+telefone'
    } else if (id) {
      const updated = await sql`
        update patients
           set full_name = ${fullName},
               phone = ${phone},
               cpf = ${optional(formData.get('cpf'))},
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
        values (${clinic.id}::uuid, ${fullName}, ${phone}, ${optional(formData.get('cpf'))}, ${optional(formData.get('birth_date'))}, ${optional(formData.get('email'))}, ${optional(formData.get('address'))}, ${optional(formData.get('guardian_name'))}, ${optional(formData.get('notes'))}, ${String(formData.get('status') || 'active')}::patient_status)
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
        <p className='text-sm text-gray-600'>Cadastre, edite, atualize e exclua pacientes da clínica.</p>
      </div>
      <FormFeedback ok={params.ok} error={params.error} />
      <form action={savePatient} className='grid gap-3 rounded border bg-white p-4 md:grid-cols-2'>
        <input name='full_name' placeholder='Nome completo *' required />
        <input name='phone' placeholder='Telefone *' required />
        <input name='cpf' placeholder='CPF' />
        <input name='birth_date' type='date' />
        <input name='email' type='email' placeholder='E-mail' />
        <input name='guardian_name' placeholder='Responsável' />
        <input name='address' className='md:col-span-2' placeholder='Endereço' />
        <textarea name='notes' className='md:col-span-2' placeholder='Observações' />
        <select name='status'>{patientStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        <SubmitButton label='Cadastrar paciente' />
      </form>
      <div className='overflow-auto rounded border'>
        <table className='w-full min-w-[980px] text-sm'>
          <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Nome</th><th className='p-2 text-left'>Telefone</th><th className='p-2 text-left'>E-mail</th><th className='p-2 text-left'>Status</th><th className='p-2 text-left'>Ações</th></tr></thead>
          <tbody>
            {(patients as any[]).map(patient => (
              <tr key={patient.id} className='border-t align-top'>
                <td className='p-2 font-medium'>{patient.full_name}</td>
                <td className='p-2'>{patient.phone}</td>
                <td className='p-2'>{patient.email || '-'}</td>
                <td className='p-2'>{statusLabel(patient.status)}</td>
                <td className='space-y-2 p-2'>
                  <details className='rounded border p-2'>
                    <summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary>
                    <form action={savePatient} className='mt-3 grid gap-2 md:grid-cols-2'>
                      <input type='hidden' name='id' value={patient.id} />
                      <input name='full_name' defaultValue={patient.full_name} required />
                      <input name='phone' defaultValue={patient.phone} required />
                      <input name='cpf' defaultValue={patient.cpf || ''} placeholder='CPF' />
                      <input name='birth_date' type='date' defaultValue={patient.birth_date || ''} />
                      <input name='email' type='email' defaultValue={patient.email || ''} placeholder='E-mail' />
                      <input name='guardian_name' defaultValue={patient.guardian_name || ''} placeholder='Responsável' />
                      <input name='address' className='md:col-span-2' defaultValue={patient.address || ''} placeholder='Endereço' />
                      <textarea name='notes' className='md:col-span-2' defaultValue={patient.notes || ''} placeholder='Observações' />
                      <select name='status' defaultValue={patient.status}>{patientStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
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
