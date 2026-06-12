import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon'
import { revalidatePath } from 'next/cache'
import { patientStatus, requireClinicAccess, statusLabel } from '@/lib/clinic'
import { formatCpf, isValidCpf, normalizeOptionalCpf } from '@/lib/cpf'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'
import { CpfInput } from './cpf-input'
import type { ReactNode } from 'react'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

type PatientRow = {
  id: string
  full_name: string
  phone: string
  cpf: string | null
  birth_date: string | Date | null
  email: string | null
  address: string | null
  guardian_name: string | null
  notes: string | null
  status: string
}

const fieldShellClass =
  'group flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm transition focus-within:border-teal-300 focus-within:bg-white focus-within:shadow-[0_14px_30px_rgba(15,23,42,0.08)] sm:p-4'
const fieldTitleClass = 'flex items-center gap-1 text-[0.78rem] font-black uppercase tracking-[0.08em] text-slate-600'
const sectionClass = 'rounded-[1.45rem] border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5'
const sectionTitleClass = 'font-[Manrope] text-base font-extrabold tracking-[-0.02em] text-slate-950'
const sectionTextClass = 'mt-1 text-sm leading-6 text-slate-500'

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

function RequiredMark() {
  return <strong className='required-mark' aria-hidden='true'>*</strong>
}

function PatientField({
  label,
  required,
  children,
  className = '',
  hint,
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
  hint?: string
}) {
  return (
    <label className={`${fieldShellClass} ${className}`}>
      <span className={fieldTitleClass}>{label} {required ? <RequiredMark /> : null}</span>
      {children}
      {hint ? <span className='text-xs leading-5 text-slate-500'>{hint}</span> : null}
    </label>
  )
}

function PatientFormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className={sectionClass}>
      <div className='mb-4'>
        <h2 className={sectionTitleClass}>{title}</h2>
        <p className={sectionTextClass}>{description}</p>
      </div>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>{children}</div>
    </div>
  )
}

function dateInputValue(value: string | Date | null | undefined) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function PatientFormFields({ patient, formIdPrefix }: { patient?: PatientRow; formIdPrefix: string }) {
  return (
    <>
      <PatientFormSection
        title='Identificação do paciente'
        description='Dados usados para localizar o cadastro e diferenciar pacientes com nomes parecidos.'>
        <PatientField label='Nome completo' required className='sm:col-span-2'>
          <input name='full_name' placeholder='Ex.: Maria Aparecida da Silva' defaultValue={patient?.full_name ?? ''} required />
        </PatientField>
        <PatientField label='Telefone' required>
          <input name='phone' type='tel' placeholder='(00) 00000-0000' defaultValue={patient?.phone ?? ''} required />
        </PatientField>
        <PatientField label='Data de nascimento'>
          <input name='birth_date' type='date' defaultValue={dateInputValue(patient?.birth_date)} />
        </PatientField>
      </PatientFormSection>

      <PatientFormSection
        title='Documentos e contato'
        description='Informações opcionais para comunicação, emissão de documentos e conferência do prontuário.'>
        <CpfInput id={`${formIdPrefix}-cpf`} defaultValue={patient?.cpf || ''} className={fieldShellClass} labelClassName={fieldTitleClass} />
        <PatientField label='E-mail' className='sm:col-span-2 xl:col-span-1'>
          <input name='email' type='email' placeholder='paciente@email.com' defaultValue={patient?.email ?? ''} />
        </PatientField>
        <PatientField label='Responsável'>
          <input name='guardian_name' placeholder='Nome do responsável, se houver' defaultValue={patient?.guardian_name ?? ''} />
        </PatientField>
        <PatientField label='Status'>
          <select name='status' defaultValue={patient?.status || 'active'}>
            {patientStatus.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </PatientField>
      </PatientFormSection>

      <PatientFormSection
        title='Endereço e observações'
        description='Use este espaço para registrar informações adicionais importantes para o atendimento.'>
        <PatientField label='Endereço' className='sm:col-span-2 xl:col-span-4'>
          <input name='address' placeholder='Rua, número, bairro, cidade e complemento' defaultValue={patient?.address ?? ''} />
        </PatientField>
        <PatientField label='Observações' className='sm:col-span-2 xl:col-span-4'>
          <textarea name='notes' placeholder='Alergias, preferências de contato, observações administrativas ou orientações internas' defaultValue={patient?.notes ?? ''} />
        </PatientField>
      </PatientFormSection>
    </>
  )
}

function PatientForm({ patient }: { patient?: PatientRow }) {
  const isEditing = Boolean(patient)
  const formIdPrefix = isEditing ? `edit-patient-${patient?.id}` : 'new-patient'

  return (
    <form action={savePatient} className='space-y-5 rounded-[1.75rem] border bg-white p-4 sm:p-5 lg:p-6'>
      {patient ? <input type='hidden' name='id' value={patient.id} /> : null}
      <PatientFormFields patient={patient} formIdPrefix={formIdPrefix} />
      <div className='flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-sm leading-6 text-slate-500'>
          Revise os campos obrigatórios antes de salvar. CPF, e-mail e observações continuam opcionais.
        </p>
        <SubmitButton label={isEditing ? 'Atualizar paciente' : 'Cadastrar paciente'} />
      </div>
    </form>
  )
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess()
  const params = (await searchParams) ?? {}
  const patients = await sql`select * from patients where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`
  const patientRows = patients as PatientRow[]

  return (
    <section className='space-y-7'>
      <div className='premium-hero'>
        <div className='relative z-[1] max-w-3xl'>
          <span className='inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-teal-100 ring-1 ring-white/15'>Cadastro de pacientes</span>
          <h1 className='mt-4 font-[Manrope] text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl'>Pacientes</h1>
          <p className='mt-3 text-base leading-7 text-slate-200'>
            Cadastre, edite, atualize e exclua pacientes da clínica com campos organizados por contexto. Campos marcados com <strong className='text-red-200'>*</strong> são obrigatórios.
          </p>
        </div>
      </div>

      <FormFeedback ok={params.ok} error={params.error} />

      <div className='rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5 lg:p-6'>
        <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='font-[Manrope] text-xl font-extrabold tracking-[-0.03em] text-slate-950'>Novo paciente</h2>
            <p className='mt-1 text-sm leading-6 text-slate-500'>Preencha primeiro os dados essenciais e depois complemente o cadastro conforme a necessidade.</p>
          </div>
          <span className='inline-flex w-fit rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700 ring-1 ring-red-100'>* obrigatório</span>
        </div>
        <PatientForm />
      </div>

      <div className='overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-sm'>
        <div className='flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5'>
          <div>
            <h2 className='font-[Manrope] text-xl font-extrabold tracking-[-0.03em] text-slate-950'>Pacientes cadastrados</h2>
            <p className='mt-1 text-sm text-slate-500'>Últimos 100 registros da clínica, com edição rápida sem sair da tela.</p>
          </div>
          <span className='inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200'>{patientRows.length} registro(s)</span>
        </div>

        <div className='overflow-auto'>
          <table className='w-full min-w-[1080px] text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-2 text-left'>Nome</th>
                <th className='p-2 text-left'>Telefone</th>
                <th className='p-2 text-left'>CPF</th>
                <th className='p-2 text-left'>E-mail</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patientRows.length === 0 ? (
                <tr>
                  <td className='p-6 text-center text-slate-500' colSpan={6}>Nenhum paciente cadastrado ainda.</td>
                </tr>
              ) : patientRows.map(patient => (
                <tr key={patient.id} className='border-t align-top'>
                  <td className='p-2 font-medium text-slate-900'>{patient.full_name}</td>
                  <td className='p-2'>{patient.phone}</td>
                  <td className='p-2'>{patient.cpf ? formatCpf(patient.cpf) : '-'}</td>
                  <td className='p-2'>{patient.email || '-'}</td>
                  <td className='p-2'>
                    <span className='inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700'>{statusLabel(patient.status)}</span>
                  </td>
                  <td className='space-y-2 p-2'>
                    <details className='rounded-2xl border border-slate-200 bg-white p-3'>
                      <summary className='cursor-pointer font-semibold text-blue-700'>Editar cadastro</summary>
                      <div className='mt-4'>
                        <PatientForm patient={patient} />
                      </div>
                    </details>
                    <form action={deletePatient} className='rounded-2xl border border-red-100 bg-red-50/40 p-3 shadow-none'>
                      <input type='hidden' name='id' value={patient.id} />
                      <DeleteConfirmButton message={`Excluir o paciente ${patient.full_name}?`} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
