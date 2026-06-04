import crypto from 'node:crypto'
import { sql } from '@/lib/neon'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireClinicAccess, statusLabel } from '@/lib/clinic'
import { issueNfse } from '@/lib/nfse'
import { SubmitButton } from '../_components/submit-button'
import { FormFeedback } from '../_components/form-feedback'
import { DeleteConfirmButton } from '../_components/delete-confirm-button'

const parseMoney = (value: string) => Number(value.replace(/\./g, '').replace(',', '.')) || 0
const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null
const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function saveProcedure(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])

  const id = optional(formData.get('id'))
  const name = optional(formData.get('name'))
  let target = '/admin/procedures'

  try {
    if (!name) {
      target += '?error=Informe+o+nome+do+procedimento'
    } else if (id) {
      const updated = await sql`
        update procedures
           set name = ${name},
               description = ${optional(formData.get('description'))},
               amount = ${parseMoney(String(formData.get('amount') || '0'))},
               estimated_minutes = ${Number(formData.get('estimated_minutes') || 0) || null},
               category = ${optional(formData.get('category'))},
               is_active = ${formData.get('is_active') === 'on'}
         where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid
         returning id
      `
      target += (updated as unknown[]).length ? '?ok=Procedimento+atualizado+com+sucesso' : '?error=Procedimento+n%C3%A3o+encontrado'
    } else {
      await sql`
        insert into procedures (clinic_id, name, description, amount, estimated_minutes, category, is_active)
        values (${clinic.id}::uuid, ${name}, ${optional(formData.get('description'))}, ${parseMoney(String(formData.get('amount') || '0'))}, ${Number(formData.get('estimated_minutes') || 0) || null}, ${optional(formData.get('category'))}, ${formData.get('is_active') === 'on'})
      `
      target += '?ok=Procedimento+cadastrado+com+sucesso'
    }
  } catch (error) {
    console.error('procedures.save')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+procedimento'
  }

  revalidatePath('/admin/procedures')
  redirect(target)
}

async function deleteProcedure(formData: FormData) {
  'use server'

  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])

  let target = '/admin/procedures'
  try {
    const id = optional(formData.get('id'))
    if (!id) {
      target += '?error=Procedimento+inv%C3%A1lido'
    } else {
      const deleted = await sql`delete from procedures where id = ${id}::uuid and clinic_id = ${clinic.id}::uuid returning id`
      target += (deleted as unknown[]).length ? '?ok=Procedimento+exclu%C3%ADdo+com+sucesso' : '?error=Procedimento+n%C3%A3o+encontrado'
    }
  } catch (error) {
    console.error('procedures.delete')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+excluir.+Verifique+se+n%C3%A3o+h%C3%A1+v%C3%ADnculos'
  }

  revalidatePath('/admin/procedures')
  redirect(target)
}

async function requestNfse(formData: FormData) {
  'use server'

  const { clinic, admin } = await requireClinicAccess(['superadmin', 'admin', 'financial'])
  const patientId = optional(formData.get('patient_id'))
  const procedureId = optional(formData.get('procedure_id'))
  const description = optional(formData.get('description'))
  const serviceCode = optional(formData.get('service_code'))
  let target = '/admin/procedures'

  try {
    if (!patientId || !procedureId || !description) {
      target += '?error=Informe+paciente%2C+servi%C3%A7o+e+descri%C3%A7%C3%A3o+da+NFSe'
    } else {
      const [patientRows, procedureRows] = await Promise.all([
        sql`select id, full_name, cpf, email from patients where id = ${patientId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
        sql`select id, name, amount from procedures where id = ${procedureId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
      ])
      const patient = (patientRows as any[])[0]
      const procedure = (procedureRows as any[])[0]
      if (!patient || !procedure) {
        target += '?error=Paciente+ou+servi%C3%A7o+n%C3%A3o+encontrado'
      } else {
        const amount = parseMoney(String(formData.get('amount') || procedure.amount || '0'))
        if (amount <= 0) {
          target += '?error=Informe+um+valor+v%C3%A1lido+para+a+NFSe'
        } else {
          const idempotencyKey = crypto.createHash('sha256').update(`${clinic.id}:${patient.id}:${procedure.id}:${amount}:${description}`).digest('hex')
          const existing = await sql`select id, status from nfse_invoices where clinic_id = ${clinic.id}::uuid and idempotency_key = ${idempotencyKey} limit 1`
          if ((existing as any[]).length) {
            target += '?error=J%C3%A1+existe+uma+NFSe+solicitada+para+este+paciente%2C+servi%C3%A7o+e+valor'
          } else {
            const result = await issueNfse({
              idempotencyKey,
              patientName: patient.full_name,
              patientDocument: patient.cpf,
              patientEmail: patient.email,
              serviceName: procedure.name,
              serviceCode,
              description,
              amount,
            })

            await sql`
              insert into nfse_invoices (
                clinic_id, patient_id, procedure_id, requested_by, idempotency_key,
                patient_name, patient_document, service_name, service_code, description, amount,
                status, external_id, number, verification_code, pdf_url, xml_url, provider, environment,
                safe_response, error_message, issued_at
              ) values (
                ${clinic.id}::uuid, ${patient.id}::uuid, ${procedure.id}::uuid, ${admin.profile.id}::uuid, ${idempotencyKey},
                ${patient.full_name}, ${patient.cpf || null}, ${procedure.name}, ${serviceCode}, ${description}, ${amount},
                ${result.status}, ${result.externalId || null}, ${result.number || null}, ${result.verificationCode || null}, ${result.pdfUrl || null}, ${result.xmlUrl || null}, ${process.env.NFSE_PROVIDER || 'national'}, ${process.env.NFSE_ENVIRONMENT || 'homologation'},
                ${JSON.stringify(result.safeResponse || {})}::jsonb, ${result.status === 'failed' || result.status === 'configuration_required' ? result.message : null}, ${result.status === 'issued' ? new Date().toISOString() : null}
              )
            `
            target += result.status === 'configuration_required'
              ? '?ok=Solicita%C3%A7%C3%A3o+registrada.+Configure+o+provedor+NFSe+para+emiss%C3%A3o+real'
              : result.status === 'issued'
                ? '?ok=NFSe+emitida+com+sucesso'
                : '?ok=Solicita%C3%A7%C3%A3o+de+NFSe+registrada'
          }
        }
      }
    }
  } catch (error) {
    console.error('nfse.request')
    target += '?error=N%C3%A3o+foi+poss%C3%ADvel+solicitar+a+NFSe.+Verifique+se+a+migration+foi+aplicada'
  }

  revalidatePath('/admin/procedures')
  redirect(target)
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist', 'financial'])

  const params = (await searchParams) ?? {}
  const [rows, patients] = await Promise.all([
    sql`select * from procedures where clinic_id = ${clinic.id}::uuid order by created_at desc limit 100`,
    sql`select id, full_name, cpf, email from patients where clinic_id = ${clinic.id}::uuid and status = 'active' order by full_name limit 200`,
  ])

  let nfseInvoices: any[] = []
  try {
    const nfseRows = await sql`
      select id, patient_name, service_name, amount, status, number, verification_code, pdf_url, xml_url, error_message, created_at, updated_at
        from nfse_invoices
       where clinic_id = ${clinic.id}::uuid
       order by created_at desc
       limit 20
    `
    nfseInvoices = nfseRows as any[]
  } catch {
    nfseInvoices = []
  }

  return (
    <section className='space-y-6'>
      <div><h1 className='text-2xl font-bold'>Procedimentos e Serviços</h1><p className='text-sm text-gray-600'>Gerencie serviços/procedimentos usados nos agendamentos, orçamentos e emissão de NFSe.</p></div>
      <FormFeedback ok={params.ok} error={params.error} />
      <form action={saveProcedure} className='grid gap-3 rounded border bg-white p-4 md:grid-cols-2'>
        <label>Nome <strong className='required-mark'>*</strong><input name='name' required placeholder='Nome do procedimento' /></label>
        <label>Valor <strong className='required-mark'>*</strong><input name='amount' required placeholder='Valor ex: 120,50' /></label>
        <label>Duração estimada<input name='estimated_minutes' type='number' min={1} placeholder='Minutos' /></label>
        <label>Categoria<input name='category' placeholder='Categoria' /></label>
        <label className='md:col-span-2'>Descrição<textarea name='description' placeholder='Descrição' /></label>
        <label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked />Ativo</label>
        <SubmitButton label='Cadastrar procedimento' />
      </form>

      <div className='overflow-auto rounded border'>
        <table className='w-full min-w-[900px] text-sm'>
          <thead className='bg-gray-50'><tr><th className='p-2 text-left'>Nome</th><th className='p-2 text-left'>Valor</th><th className='p-2 text-left'>Categoria</th><th className='p-2 text-left'>Ativo</th><th className='p-2 text-left'>Ações</th></tr></thead>
          <tbody>{(rows as any[]).map(row => (
            <tr key={row.id} className='border-t align-top'>
              <td className='p-2 font-medium'>{row.name}</td><td className='p-2'>{money(row.amount)}</td><td className='p-2'>{row.category || '-'}</td><td className='p-2'>{row.is_active ? 'Sim' : 'Não'}</td>
              <td className='space-y-2 p-2'>
                <details className='rounded border p-2'><summary className='cursor-pointer font-semibold text-blue-700'>Editar</summary>
                  <form action={saveProcedure} className='mt-3 grid gap-2 md:grid-cols-2'>
                    <input type='hidden' name='id' value={row.id} />
                    <label>Nome <strong className='required-mark'>*</strong><input name='name' defaultValue={row.name} required /></label>
                    <label>Valor <strong className='required-mark'>*</strong><input name='amount' defaultValue={String(row.amount).replace('.', ',')} required /></label>
                    <label>Duração<input name='estimated_minutes' type='number' min={1} defaultValue={row.estimated_minutes || ''} placeholder='Duração' /></label>
                    <label>Categoria<input name='category' defaultValue={row.category || ''} placeholder='Categoria' /></label>
                    <label className='md:col-span-2'>Descrição<textarea name='description' className='md:col-span-2' defaultValue={row.description || ''} /></label>
                    <label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked={row.is_active} />Ativo</label>
                    <SubmitButton label='Atualizar' />
                  </form>
                </details>
                <form action={deleteProcedure}><input type='hidden' name='id' value={row.id} /><DeleteConfirmButton message={`Excluir o procedimento ${row.name}?`} /></form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div id='nfse' className='grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
        <form action={requestNfse} className='space-y-4 rounded-xl border bg-white p-5 shadow-sm'>
          <div>
            <p className='text-sm font-semibold uppercase tracking-wide text-blue-700'>Nota Fiscal Eletrônica de Serviço</p>
            <h2 className='text-xl font-bold'>Gerar NFSe</h2>
            <p className='text-sm text-slate-600'>Fluxo preparado com adapter. Sem provedor configurado, a solicitação fica registrada como pendente de configuração.</p>
          </div>
          <label>Paciente/tomador <strong className='required-mark'>*</strong><select name='patient_id' required><option value=''>Selecione</option>{(patients as any[]).map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select></label>
          <label>Serviço/procedimento <strong className='required-mark'>*</strong><select name='procedure_id' required><option value=''>Selecione</option>{(rows as any[]).filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.name} · {money(row.amount)}</option>)}</select></label>
          <label>Código do serviço municipal<input name='service_code' placeholder='Ex.: item da lista de serviços/ISS' /></label>
          <label>Valor da nota <strong className='required-mark'>*</strong><input name='amount' placeholder='Ex.: 250,00' required /></label>
          <label>Descrição da nota <strong className='required-mark'>*</strong><textarea name='description' required rows={4} placeholder='Descreva o serviço prestado conforme exigência municipal.' /></label>
          <SubmitButton label='Solicitar emissão de NFSe' />
          <p className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>Não informe tokens, senhas ou certificados no formulário. Credenciais devem ficar somente em variáveis de ambiente.</p>
        </form>

        <div className='rounded-xl border bg-white p-5 shadow-sm'>
          <div className='mb-4'>
            <h2 className='text-xl font-bold'>NFSe recentes</h2>
            <p className='text-sm text-slate-600'>Acompanhe status, número, PDF/XML e mensagens de erro do provedor.</p>
          </div>
          {nfseInvoices.length ? (
            <div className='overflow-auto'>
              <table className='w-full min-w-[720px] text-sm'>
                <thead><tr><th className='text-left'>Tomador</th><th className='text-left'>Serviço</th><th className='text-left'>Valor</th><th className='text-left'>Status</th><th className='text-left'>Arquivos</th></tr></thead>
                <tbody>{nfseInvoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>{invoice.patient_name || '-'}</td>
                    <td>{invoice.service_name || '-'}</td>
                    <td>{money(invoice.amount)}</td>
                    <td><span className='premium-status'>{statusLabel(invoice.status)}</span>{invoice.error_message ? <small className='mt-1 block text-red-700'>{invoice.error_message}</small> : null}</td>
                    <td className='space-x-2'>{invoice.pdf_url ? <a className='text-blue-700 underline' href={invoice.pdf_url} target='_blank'>PDF</a> : null}{invoice.xml_url ? <a className='text-blue-700 underline' href={invoice.xml_url} target='_blank'>XML</a> : null}{!invoice.pdf_url && !invoice.xml_url ? '-' : null}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className='rounded-xl bg-slate-50 p-4 text-sm text-slate-600'>Nenhuma NFSe registrada ainda. Aplique a migration 009 para habilitar o histórico fiscal.</p>}
        </div>
      </div>
    </section>
  )
}
