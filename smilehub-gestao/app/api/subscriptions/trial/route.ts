import { getCurrentSubscriptionContext, startFreeTrial } from '@/lib/subscription'

export async function POST() {
  try {
    const context = await getCurrentSubscriptionContext()
    if (!context.admin) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    if (!context.clinic) return Response.json({ message: 'Clínica não encontrada.' }, { status: 404 })
    const subscription = await startFreeTrial(context.clinic.id)
    return Response.json({ message: 'Teste grátis ativado por 7 dias.', subscription })
  } catch (error: any) {
    return Response.json({ message: error.message || 'Não foi possível ativar o teste grátis.' }, { status: 400 })
  }
}
