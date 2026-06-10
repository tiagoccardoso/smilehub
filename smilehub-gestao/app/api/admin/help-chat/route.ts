import { requireClinicAccess } from '@/lib/clinic'
import { DeepSeekServiceError, generateSmileHubHelpAnswer } from '@/lib/deepseek'

function cleanQuestion(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)
}

export async function POST(req: Request) {
  try {
    await requireClinicAccess(['superadmin', 'admin', 'dentist', 'reception'])
    const body = await req.json().catch(() => ({}))
    const question = cleanQuestion(body.question)

    if (!question) {
      return Response.json({ message: 'Informe uma dúvida sobre o sistema.' }, { status: 400 })
    }

    const answer = await generateSmileHubHelpAnswer(question)
    return Response.json({ answer })
  } catch (error: any) {
    if (error instanceof DeepSeekServiceError) {
      return Response.json({ message: error.message, code: error.code }, { status: error.status })
    }

    console.error('admin.help-chat')
    return Response.json({ message: 'Não foi possível responder a dúvida no momento.' }, { status: 500 })
  }
}
