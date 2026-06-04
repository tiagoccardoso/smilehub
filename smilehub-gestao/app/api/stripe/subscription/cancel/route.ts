import { getCurrentSubscriptionContext } from '@/lib/subscription'
import { stripeRequest, upsertSubscriptionFromStripe } from '@/lib/stripe'

export async function POST() {
  try {
    const context = await getCurrentSubscriptionContext()
    if (!context.admin) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    if (!context.clinic) return Response.json({ message: 'Clínica não vinculada ao usuário.' }, { status: 404 })
    const subscriptionId = context.subscription?.stripe_subscription_id
    if (!subscriptionId) return Response.json({ message: 'Nenhuma assinatura Stripe ativa para cancelar.' }, { status: 400 })

    const subscription = await stripeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      data: { cancel_at_period_end: true },
    })
    await upsertSubscriptionFromStripe(subscription as any, { clinicId: context.clinic?.id || null })

    return Response.json({ message: 'Cancelamento agendado para o fim do período atual.' })
  } catch (error: any) {
    console.error('[stripe/subscription/cancel]', error)
    return Response.json({ message: error.message || 'Não foi possível cancelar a assinatura.' }, { status: 500 })
  }
}
