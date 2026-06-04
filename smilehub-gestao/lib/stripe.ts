import crypto from 'node:crypto'
import { sql } from '@/lib/neon'
import { planCodeFromStripePrice, type SubscriptionPlanCode } from '@/lib/subscription'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

type StripeRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  data?: Record<string, any>
  idempotencyKey?: string
}

export type StripeSubscriptionLike = {
  id: string
  customer?: string | { id?: string } | null
  status?: string | null
  current_period_end?: number | null
  cancel_at_period_end?: boolean | null
  canceled_at?: number | null
  metadata?: Record<string, string | undefined> | null
  items?: { data?: Array<{ id?: string; price?: { id?: string | null } | null }> } | null
}

function getStripeSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('Variável de ambiente STRIPE_SECRET_KEY ausente')
  return secret
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function appendParam(params: URLSearchParams, key: string, value: any) {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([childKey, childValue]) => appendParam(params, `${key}[${index}][${childKey}]`, childValue))
      } else {
        appendParam(params, `${key}[${index}]`, item)
      }
    })
    return
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => appendParam(params, `${key}[${childKey}]`, childValue))
    return
  }
  params.append(key, String(value))
}

function encodeForm(data?: Record<string, any>) {
  const params = new URLSearchParams()
  if (!data) return params
  Object.entries(data).forEach(([key, value]) => appendParam(params, key, value))
  return params
}

export async function stripeRequest<T = any>(path: string, options: StripeRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET'
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
  }
  const init: RequestInit = { method, headers, cache: 'no-store' }

  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (method !== 'GET' && options.data) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    init.body = encodeForm(options.data).toString()
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.error?.message || 'Erro ao comunicar com o Stripe.'
    throw new Error(message)
  }
  return payload as T
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!secret) throw new Error('Variável de ambiente STRIPE_WEBHOOK_SECRET ausente')
  if (!signatureHeader) throw new Error('Cabeçalho Stripe-Signature ausente')

  const entries = signatureHeader.split(',').map(part => part.trim())
  const timestamp = entries.find(part => part.startsWith('t='))?.slice(2)
  const signatures = entries.filter(part => part.startsWith('v1=')).map(part => part.slice(3))
  if (!timestamp || !signatures.length) throw new Error('Assinatura Stripe inválida')

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex')

  const verified = signatures.some(signature => {
    const left = Buffer.from(signature, 'hex')
    const right = Buffer.from(expected, 'hex')
    return left.length === right.length && crypto.timingSafeEqual(left, right)
  })

  if (!verified) throw new Error('Assinatura Stripe não confere')

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (Number.isFinite(age) && age > 300) throw new Error('Assinatura Stripe expirada')
}

export async function createStripeCustomer(input: { email?: string | null; name?: string | null; clinicId: string; userId: string }) {
  return stripeRequest<{ id: string }>('/customers', {
    method: 'POST',
    data: {
      email: input.email || undefined,
      name: input.name || undefined,
      metadata: {
        clinic_id: input.clinicId,
        user_id: input.userId,
        app: 'smilehub',
      },
    },
    idempotencyKey: `smilehub_customer_${input.clinicId}`,
  })
}

export function getPriceIdForPlan(plan: SubscriptionPlanCode) {
  if (plan === 'mensal') return process.env.STRIPE_PRICE_ID_MONTHLY
  if (plan === 'anual') return process.env.STRIPE_PRICE_ID_ANNUAL
  return undefined
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscriptionLike>(`/subscriptions/${subscriptionId}?expand[]=items.data.price`)
}

export function unixToIso(value?: number | null) {
  if (!value) return null
  return new Date(value * 1000).toISOString()
}

function customerIdFromSubscription(subscription: StripeSubscriptionLike) {
  if (!subscription.customer) return null
  return typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id || null
}

function firstPriceId(subscription: StripeSubscriptionLike) {
  return subscription.items?.data?.[0]?.price?.id || null
}

export async function upsertSubscriptionFromStripe(subscription: StripeSubscriptionLike, fallback?: { clinicId?: string | null; planCode?: SubscriptionPlanCode | null; checkoutSessionId?: string | null }) {
  const priceId = firstPriceId(subscription)
  const planCode = (subscription.metadata?.plan_code as SubscriptionPlanCode | undefined) || planCodeFromStripePrice(priceId) || fallback?.planCode || 'gestao'
  const clinicIdFromMetadata = subscription.metadata?.clinic_id || fallback?.clinicId || null
  const customerId = customerIdFromSubscription(subscription)

  let clinicId = clinicIdFromMetadata
  if (!clinicId && customerId) {
    const rows = await sql`
      select clinic_id from public.clinic_subscriptions
       where stripe_customer_id = ${customerId}
       order by created_at desc
       limit 1
    `
    clinicId = (rows as any[])[0]?.clinic_id || null
  }

  if (!clinicId) throw new Error('Não foi possível identificar a clínica da assinatura Stripe.')

  if (fallback?.checkoutSessionId) {
    const updated = await sql`
      update public.clinic_subscriptions
         set plan_code = ${planCode},
             status = ${subscription.status || 'incomplete'},
             current_period_ends_at = ${unixToIso(subscription.current_period_end)}::timestamptz,
             stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
             stripe_subscription_id = ${subscription.id},
             stripe_price_id = ${priceId},
             canceled_at = ${unixToIso(subscription.canceled_at)}::timestamptz,
             cancel_at_period_end = ${Boolean(subscription.cancel_at_period_end)},
             updated_at = now()
       where stripe_checkout_session_id = ${fallback.checkoutSessionId}
       returning *
    `
    if ((updated as any[]).length) return (updated as any[])[0]
  }

  const rows = await sql`
    insert into public.clinic_subscriptions (
      clinic_id,
      plan_code,
      status,
      current_period_ends_at,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      stripe_checkout_session_id,
      canceled_at,
      cancel_at_period_end
    )
    values (
      ${clinicId}::uuid,
      ${planCode},
      ${subscription.status || 'incomplete'},
      ${unixToIso(subscription.current_period_end)}::timestamptz,
      ${customerId},
      ${subscription.id},
      ${priceId},
      ${fallback?.checkoutSessionId || null},
      ${unixToIso(subscription.canceled_at)}::timestamptz,
      ${Boolean(subscription.cancel_at_period_end)}
    )
    on conflict (stripe_subscription_id) do update set
      plan_code = excluded.plan_code,
      status = excluded.status,
      current_period_ends_at = excluded.current_period_ends_at,
      stripe_customer_id = coalesce(excluded.stripe_customer_id, public.clinic_subscriptions.stripe_customer_id),
      stripe_price_id = excluded.stripe_price_id,
      stripe_checkout_session_id = coalesce(excluded.stripe_checkout_session_id, public.clinic_subscriptions.stripe_checkout_session_id),
      canceled_at = excluded.canceled_at,
      cancel_at_period_end = excluded.cancel_at_period_end,
      updated_at = now()
    returning *
  `

  return (rows as any[])[0]
}

export async function updateLocalSubscriptionAfterCheckout(input: {
  clinicId: string
  customerId: string
  checkoutSessionId: string
  planCode: SubscriptionPlanCode
  priceId: string
}) {
  await sql`
    update public.clinic_subscriptions
       set stripe_customer_id = ${input.customerId},
           stripe_checkout_session_id = ${input.checkoutSessionId},
           stripe_price_id = ${input.priceId},
           plan_code = ${input.planCode},
           status = case
             when status = 'trialing' and trial_ends_at is not null and trial_ends_at > now() then status
             else 'incomplete'
           end,
           updated_at = now()
     where id = (
       select id from public.clinic_subscriptions
        where clinic_id = ${input.clinicId}::uuid
        order by created_at desc
        limit 1
     )
  `
}
