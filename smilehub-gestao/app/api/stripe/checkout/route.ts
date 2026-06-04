import { getCurrentSubscriptionContext } from '@/lib/subscription'
import { createStripeCustomer, getAppUrl, getPriceIdForPlan, stripeRequest, updateLocalSubscriptionAfterCheckout } from '@/lib/stripe'
import { ensureClinicSubscription, type SubscriptionPlanCode } from '@/lib/subscription'
import { sql } from '@/lib/neon'

const paidPlans = new Set<SubscriptionPlanCode>(['mensal', 'anual'])

export async function POST(req: Request) {
  try {
    const context = await getCurrentSubscriptionContext()
    if (!context.admin) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    if (!context.clinic) return Response.json({ message: 'Clínica não vinculada ao usuário.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const plan = body.plan as SubscriptionPlanCode
    if (!paidPlans.has(plan)) return Response.json({ message: 'Plano inválido para checkout.' }, { status: 400 })

    const priceId = getPriceIdForPlan(plan)
    if (!priceId) return Response.json({ message: `Configure o ID de preço Stripe para o plano ${plan}.` }, { status: 500 })

    const currentSubscription = await ensureClinicSubscription(context.clinic.id)
    if (!currentSubscription) return Response.json({ message: 'Não foi possível preparar a assinatura da clínica.' }, { status: 500 })
    let customerId = currentSubscription.stripe_customer_id || null

    if (!customerId) {
      const customer = await createStripeCustomer({
        email: context.admin.profile.email,
        name: context.admin.profile.name,
        clinicId: context.clinic.id,
        userId: context.admin.profile.id,
      })
      customerId = customer.id
      await sql`
        update public.clinic_subscriptions
           set stripe_customer_id = ${customerId}, updated_at = now()
         where id = ${currentSubscription.id}::uuid
      `
    }

    const appUrl = getAppUrl()
    const session = await stripeRequest<{ id: string; url?: string }>('/checkout/sessions', {
      method: 'POST',
      data: {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: context.clinic.id,
        success_url: `${appUrl}/admin/subscriptions?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/admin/subscriptions?checkout=cancel`,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          app: 'smilehub',
          clinic_id: context.clinic.id,
          user_id: context.admin.profile.id,
          plan_code: plan,
        },
        subscription_data: {
          metadata: {
            app: 'smilehub',
            clinic_id: context.clinic.id,
            user_id: context.admin.profile.id,
            plan_code: plan,
          },
        },
      },
      idempotencyKey: `smilehub_checkout_${context.clinic.id}_${plan}_${Date.now()}`,
    })

    await updateLocalSubscriptionAfterCheckout({
      clinicId: context.clinic.id,
      customerId,
      checkoutSessionId: session.id,
      planCode: plan,
      priceId,
    })

    if (!session.url) return Response.json({ message: 'O Stripe não retornou a URL do checkout.' }, { status: 502 })
    return Response.json({ url: session.url })
  } catch (error: any) {
    console.error('[stripe/checkout]', error)
    return Response.json({ message: error.message || 'Não foi possível iniciar o checkout.' }, { status: 500 })
  }
}
