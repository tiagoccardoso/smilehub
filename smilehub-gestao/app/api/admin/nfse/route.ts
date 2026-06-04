import crypto from 'node:crypto'
import { requireClinicAccess } from '@/lib/clinic'
import { issueNfse } from '@/lib/nfse'
import { sql } from '@/lib/neon'

const money = (value: unknown) => Number(String(value || '0').replace(/\./g, '').replace(',', '.')) || 0
const text = (value: unknown, max = 1000) => String(value || '').trim().slice(0, max)

export async function POST(req: Request) {
  try {
    const { clinic, admin } = await requireClinicAccess(['superadmin', 'admin', 'financial'])
    const body = await req.json()
    const patientId = text(body.patient_id)
    const procedureId = text(body.procedure_id)
    const amount = money(body.amount)
    const description = text(body.description, 1500)
    const serviceCode = text(body.service_code, 80) || null

    if (!patientId || !procedureId || amount <= 0 || !description) {
      return Response.json({ message: 'Informe paciente, serviço, valor e descrição para emitir a NFSe.' }, { status: 400 })
    }

    const [patientRows, procedureRows] = await Promise.all([
      sql`select id, full_name, cpf, email from patients where id = ${patientId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
      sql`select id, name, amount from procedures where id = ${procedureId}::uuid and clinic_id = ${clinic.id}::uuid limit 1`,
    ])
    const patient = (patientRows as any[])[0]
    const procedure = (procedureRows as any[])[0]
    if (!patient || !procedure) return Response.json({ message: 'Paciente ou serviço não encontrado.' }, { status: 404 })

    const idempotencyKey = crypto.createHash('sha256').update(`${clinic.id}:${patientId}:${procedureId}:${amount}:${description}`).digest('hex')
    const existing = await sql`select * from nfse_invoices where clinic_id = ${clinic.id}::uuid and idempotency_key = ${idempotencyKey} limit 1`
    if ((existing as any[]).length) return Response.json({ message: 'NFSe já solicitada para este conjunto de dados.', invoice: (existing as any[])[0] })

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

    const rows = await sql`
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
      returning *
    `

    return Response.json({ message: result.message, invoice: (rows as any[])[0] })
  } catch (error: any) {
    console.error('nfse.post')
    return Response.json({ message: error?.message || 'Não foi possível processar a NFSe.' }, { status: 400 })
  }
}
