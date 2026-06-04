import { getCurrentSubscriptionContext } from '@/lib/subscription'
import { getAppUrl, stripeRequest } from '@/lib/stripe'

export async function POST() {
  try {
    const context = await getCurrentSubscriptionContext()
    if (!context.admin) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    if (!context.clinic) return Response.json({ message: 'Clínica não vinculada ao usuário.' }, { status: 404 })
    const customerId = context.subscription?.stripe_customer_id
    if (!customerId) return Response.json({ message: 'Nenhum cliente Stripe vinculado a esta clínica.' }, { status: 400 })

    const session = await stripeRequest<{ url?: string }>('/billing_portal/sessions', {
      method: 'POST',
      data: {
        customer: customerId,
        return_url: `${getAppUrl()}/admin/subscriptions?portal=return`,
      },
    })

    if (!session.url) return Response.json({ message: 'O Stripe não retornou a URL do portal.' }, { status: 502 })
    return Response.json({ url: session.url })
  } catch (error: any) {
    console.error('[stripe/portal]', error)
    return Response.json({ message: error.message || 'Não foi possível abrir o portal Stripe.' }, { status: 500 })
  }
}
