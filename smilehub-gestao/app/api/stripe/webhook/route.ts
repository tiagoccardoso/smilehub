import { sql } from '@/lib/neon'
import { retrieveStripeSubscription, upsertSubscriptionFromStripe, verifyStripeWebhookSignature } from '@/lib/stripe'
import { planCodeFromStripePrice, type SubscriptionPlanCode } from '@/lib/subscription'

export const runtime = 'nodejs'

type StripeEvent = {
  id: string
  type: string
  data: { object: any }
}

function getPlanFromSession(session: any): SubscriptionPlanCode | null {
  const metadataPlan = session?.metadata?.plan_code as SubscriptionPlanCode | undefined
  if (metadataPlan === 'mensal' || metadataPlan === 'anual') return metadataPlan
  return null
}

async function markEventAsProcessing(event: StripeEvent) {
  const rows = await sql`
    insert into public.stripe_webhook_events (event_id, event_type)
    values (${event.id}, ${event.type})
    on conflict (event_id) do nothing
    returning event_id
  `
  return (rows as any[]).length > 0
}

async function markEventProcessed(event: StripeEvent) {
  await sql`
    update public.stripe_webhook_events
       set processed_at = now(), processing_error = null
     where event_id = ${event.id}
  `
}

async function markEventFailed(event: StripeEvent, error: unknown) {
  await sql`
    update public.stripe_webhook_events
       set processing_error = ${error instanceof Error ? error.message : 'Erro desconhecido'}
     where event_id = ${event.id}
  `
}

async function handleCheckoutCompleted(session: any) {
  if (session?.mode !== 'subscription' || !session?.subscription) return
  const subscription = await retrieveStripeSubscription(String(session.subscription))
  await upsertSubscriptionFromStripe(subscription, {
    clinicId: session?.metadata?.clinic_id || session?.client_reference_id || null,
    planCode: getPlanFromSession(session),
    checkoutSessionId: session?.id || null,
  })
}

async function handleSubscriptionEvent(subscription: any) {
  await upsertSubscriptionFromStripe(subscription)
}

async function handleInvoiceEvent(invoice: any) {
  const subscriptionId = invoice?.subscription
  if (!subscriptionId) return
  const subscription = await retrieveStripeSubscription(String(subscriptionId))
  await upsertSubscriptionFromStripe(subscription)
}

async function handleSubscriptionDeleted(subscription: any) {
  const priceId = subscription?.items?.data?.[0]?.price?.id || null
  const planCode = subscription?.metadata?.plan_code || planCodeFromStripePrice(priceId) || 'gestao'
  await upsertSubscriptionFromStripe({ ...subscription, status: 'canceled' }, { planCode })
}

export async function POST(req: Request) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature')

  try {
    verifyStripeWebhookSignature(payload, signature)
  } catch (error: any) {
    console.error('[stripe/webhook] assinatura inválida', error)
    return Response.json({ message: 'Webhook Stripe inválido.' }, { status: 400 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(payload)
  } catch {
    return Response.json({ message: 'Payload Stripe inválido.' }, { status: 400 })
  }

  const shouldProcess = await markEventAsProcessing(event)
  if (!shouldProcess) return Response.json({ received: true, duplicated: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(event.data.object)
        break
      default:
        break
    }

    await markEventProcessed(event)
    return Response.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook] erro ao processar evento', event.type, error)
    await markEventFailed(event, error)
    return Response.json({ message: 'Erro ao processar webhook Stripe.' }, { status: 500 })
  }
}
