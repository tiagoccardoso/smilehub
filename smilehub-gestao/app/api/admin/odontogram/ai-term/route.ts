import { requireClinicAccess } from '@/lib/clinic'
import {
  DeepSeekServiceError,
  generateResponsibilityTermWithDeepSeek,
  type DeepSeekTermEntry,
} from '@/lib/deepseek'

const chartTypes = new Set(['adult', 'children'])

function text(value: unknown, max = 800) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function entries(value: unknown): DeepSeekTermEntry[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 40).map((entry: any) => ({
    tooth_code: text(entry?.tooth_code, 10),
    procedure: text(entry?.procedure, 180),
    status: text(entry?.status, 80),
    condition: text(entry?.condition, 140),
    notes: text(entry?.notes, 220),
    scheduled_date: text(entry?.scheduled_date, 30),
  }))
}

export async function POST(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin', 'dentist'])
    const body = await req.json()
    const chartType = chartTypes.has(text(body.chartType, 20)) ? text(body.chartType, 20) : 'adult'

    const generatedText = await generateResponsibilityTermWithDeepSeek({
      clinicId: clinic.id,
      chartType: chartType as 'adult' | 'children',
      patientName: text(body.patientName, 120),
      childName: text(body.childName, 120),
      birthOrAge: text(body.birthOrAge, 80),
      guardianName: text(body.guardianName, 120),
      relationship: text(body.relationship, 80),
      professionalName: text(body.professionalName, 120),
      authorizedProcedures: text(body.authorizedProcedures, 1200),
      observations: text(body.observations, 1200),
      entries: entries(body.entries),
    })

    return Response.json({
      text: generatedText,
      disclaimer:
        'Sugestão gerada por IA para apoio textual. Revise o conteúdo antes de salvar, imprimir ou coletar assinatura.',
    })
  } catch (error: any) {
    if (error instanceof DeepSeekServiceError) {
      return Response.json({ message: error.message, code: error.code }, { status: error.status })
    }

    console.error('odontogram.ai-term')
    return Response.json(
      { message: 'Não foi possível gerar a sugestão do termo no momento.' },
      { status: 500 },
    )
  }
}
