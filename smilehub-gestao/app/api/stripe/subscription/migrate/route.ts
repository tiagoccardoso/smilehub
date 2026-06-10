import { getCurrentSubscriptionContext } from '@/lib/subscription'
import { getPriceIdForPlan, retrieveStripeSubscription, stripeRequest, upsertSubscriptionFromStripe } from '@/lib/stripe'

export async function POST() {
  try {
    const context = await getCurrentSubscriptionContext()
    if (!context.admin) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    if (!context.clinic) return Response.json({ message: 'Clínica não vinculada ao usuário.' }, { status: 404 })
    const subscriptionId = context.subscription?.stripe_subscription_id
    if (!subscriptionId) return Response.json({ message: 'Nenhuma assinatura Stripe encontrada para migração.' }, { status: 400 })
    if (context.subscription?.status !== 'active') return Response.json({ message: 'A migração está disponível apenas para assinatura ativa.' }, { status: 400 })
    if (context.subscription?.plan_code === 'anual') return Response.json({ message: 'A clínica já está no plano anual.' })
    if (context.subscription?.plan_code !== 'mensal') return Response.json({ message: 'A migração automática está disponível apenas do plano mensal para o anual.' }, { status: 400 })

    const annualPriceId = getPriceIdForPlan('anual')
    if (!annualPriceId) return Response.json({ message: 'Configure STRIPE_PRICE_ID_ANNUAL para migrar o plano.' }, { status: 500 })

    const current = await retrieveStripeSubscription(subscriptionId)
    const itemId = current.items?.data?.[0]?.id
    if (!itemId) return Response.json({ message: 'Não foi possível identificar o item da assinatura no Stripe.' }, { status: 400 })

    const updated = await stripeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      data: {
        items: [{ id: itemId, price: annualPriceId }],
        proration_behavior: 'create_prorations',
        metadata: {
          ...(current.metadata || {}),
          app: 'smilehub',
          clinic_id: context.clinic?.id,
          user_id: context.admin?.profile.id,
          plan_code: 'anual',
        },
      },
    })

    await upsertSubscriptionFromStripe(updated as any, { clinicId: context.clinic?.id || null, planCode: 'anual' })
    return Response.json({ message: 'Migração para o plano anual solicitada com sucesso.' })
  } catch (error: any) {
    console.error('[stripe/subscription/migrate]', error)
    return Response.json({ message: error.message || 'Não foi possível migrar para o plano anual.' }, { status: 500 })
  }
}
