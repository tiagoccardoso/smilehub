import { redirect } from 'next/navigation'
import { getCurrentAdminProfile } from '@/lib/auth'
import { sql } from '@/lib/neon'
import type { AdminRole } from '@/lib/types'

export type SubscriptionPlanCode = 'gestao' | 'personalizado' | 'mensal' | 'anual'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'

export type SubscriptionRow = {
  id: string
  clinic_id: string
  plan_code: SubscriptionPlanCode | string
  status: SubscriptionStatus | string
  trial_started_at?: string | null
  trial_ends_at?: string | null
  current_period_ends_at?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  stripe_checkout_session_id?: string | null
  canceled_at?: string | null
  cancel_at_period_end?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type SubscriptionContext = {
  admin: NonNullable<Awaited<ReturnType<typeof getCurrentAdminProfile>>> | null
  clinic: {
    id: string
    name: string
    slug: string
    status: string
    logo_url?: string | null
  } | null
  clinicRole?: AdminRole | null
  isOwner?: boolean | null
  subscription: SubscriptionRow | null
  access: SubscriptionAccess
}

export type SubscriptionAccess = {
  hasAccess: boolean
  reason: 'active_subscription' | 'valid_trial' | 'no_subscription' | 'expired_trial' | 'inactive_subscription'
  message: string
  daysLeft?: number
}

const VALID_PAID_STATUSES = new Set(['active'])
const BLOCKED_STATUSES = new Set(['past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'])

function toDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getSubscriptionAccess(subscription?: SubscriptionRow | null, now = new Date()): SubscriptionAccess {
  if (!subscription) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      message: 'Nenhuma assinatura ou teste grátis foi encontrado para esta clínica.',
    }
  }

  if (VALID_PAID_STATUSES.has(subscription.status)) {
    return {
      hasAccess: true,
      reason: 'active_subscription',
      message: 'Assinatura ativa. Acesso completo liberado.',
    }
  }

  const trialEndsAt = toDate(subscription.trial_ends_at)
  if (subscription.status === 'trialing' && trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
    const diffMs = trialEndsAt.getTime() - now.getTime()
    return {
      hasAccess: true,
      reason: 'valid_trial',
      daysLeft: Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))),
      message: 'Teste grátis válido. Acesso completo liberado durante o período de avaliação.',
    }
  }

  if (subscription.status === 'trialing') {
    return {
      hasAccess: false,
      reason: 'expired_trial',
      message: 'Seu teste grátis expirou. Escolha um plano para continuar usando o sistema.',
    }
  }

  if (BLOCKED_STATUSES.has(subscription.status)) {
    return {
      hasAccess: false,
      reason: 'inactive_subscription',
      message: 'Sua assinatura não está ativa. Regularize ou escolha um plano para liberar o acesso.',
    }
  }

  return {
    hasAccess: false,
    reason: 'inactive_subscription',
    message: 'Não foi possível confirmar uma assinatura ativa para esta clínica.',
  }
}

export async function getCurrentSubscriptionContext(): Promise<SubscriptionContext> {
  const admin = await getCurrentAdminProfile()
  if (!admin) {
    return { admin: null, clinic: null, subscription: null, access: getSubscriptionAccess(null) }
  }

  const rows = await sql`
    select c.id as clinic_id,
           c.name as clinic_name,
           c.slug as clinic_slug,
           c.status as clinic_status,
           c.logo_url,
           cu.role as clinic_role,
           cu.is_owner,
           cs.id as subscription_id,
           cs.plan_code,
           cs.status as subscription_status,
           cs.trial_started_at,
           cs.trial_ends_at,
           cs.current_period_ends_at,
           cs.stripe_customer_id,
           cs.stripe_subscription_id,
           cs.stripe_price_id,
           cs.stripe_checkout_session_id,
           cs.canceled_at,
           cs.cancel_at_period_end,
           cs.created_at as subscription_created_at,
           cs.updated_at as subscription_updated_at
      from public.clinic_users cu
      join public.clinics c on c.id = cu.clinic_id
      left join lateral (
        select *
          from public.clinic_subscriptions
         where clinic_id = c.id
         order by created_at desc
         limit 1
      ) cs on true
     where cu.user_id = ${admin.profile.id}::uuid
       and c.status <> 'blocked'
     order by cu.is_owner desc, cu.created_at asc
     limit 1
  `

  const row = (rows as any[])[0]
  if (!row) {
    return { admin, clinic: null, subscription: null, access: getSubscriptionAccess(null) }
  }

  const subscription: SubscriptionRow | null = row.subscription_id
    ? {
        id: row.subscription_id,
        clinic_id: row.clinic_id,
        plan_code: row.plan_code,
        status: row.subscription_status,
        trial_started_at: row.trial_started_at,
        trial_ends_at: row.trial_ends_at,
        current_period_ends_at: row.current_period_ends_at,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: row.stripe_subscription_id,
        stripe_price_id: row.stripe_price_id,
        stripe_checkout_session_id: row.stripe_checkout_session_id,
        canceled_at: row.canceled_at,
        cancel_at_period_end: row.cancel_at_period_end,
        created_at: row.subscription_created_at,
        updated_at: row.subscription_updated_at,
      }
    : null

  return {
    admin,
    clinic: { id: row.clinic_id, name: row.clinic_name, slug: row.clinic_slug, status: row.clinic_status, logo_url: row.logo_url },
    clinicRole: row.clinic_role,
    isOwner: row.is_owner,
    subscription,
    access: getSubscriptionAccess(subscription),
  }
}

export async function requireSubscriptionContext(): Promise<SubscriptionContext> {
  const context = await getCurrentSubscriptionContext()
  if (!context.admin) redirect('/admin')
  if (!context.clinic) redirect('/admin?error=Clinica+nao+vinculada')
  return context
}

export async function requireActiveSubscription() {
  const context = await requireSubscriptionContext()
  if (!context.access.hasAccess) {
    const reason = encodeURIComponent(context.access.reason)
    redirect(`/admin/subscriptions?bloqueado=1&motivo=${reason}`)
  }
  return context
}

export async function ensureClinicSubscription(clinicId: string, planCode: SubscriptionPlanCode = 'gestao') {
  const existing = await sql`
    select * from public.clinic_subscriptions
     where clinic_id = ${clinicId}::uuid
     order by created_at desc
     limit 1
  `
  const current = (existing as SubscriptionRow[])[0]
  if (current) return current

  const rows = await sql`
    insert into public.clinic_subscriptions (clinic_id, plan_code, status)
    values (${clinicId}::uuid, ${planCode}, 'incomplete')
    returning *
  `
  return (rows as SubscriptionRow[])[0] ?? null
}

export async function startFreeTrial(clinicId: string) {
  const currentRows = await sql`
    select * from public.clinic_subscriptions
     where clinic_id = ${clinicId}::uuid
     order by created_at desc
     limit 1
  `
  const current = (currentRows as SubscriptionRow[])[0]

  if (current?.trial_started_at || current?.trial_ends_at) {
    const access = getSubscriptionAccess(current)
    if (access.hasAccess && access.reason === 'valid_trial') return current
    throw new Error('O teste grátis desta clínica já foi utilizado.')
  }

  if (current) {
    const rows = await sql`
      update public.clinic_subscriptions
         set status = 'trialing',
             plan_code = 'gestao',
             trial_started_at = now(),
             trial_ends_at = now() + interval '7 days',
             updated_at = now()
       where id = ${current.id}::uuid
       returning *
    `
    return (rows as SubscriptionRow[])[0]
  }

  const rows = await sql`
    insert into public.clinic_subscriptions (clinic_id, plan_code, status, trial_started_at, trial_ends_at)
    values (${clinicId}::uuid, 'gestao', 'trialing', now(), now() + interval '7 days')
    returning *
  `
  return (rows as SubscriptionRow[])[0]
}

export function planCodeFromStripePrice(priceId?: string | null): SubscriptionPlanCode | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'mensal'
  if (priceId === process.env.STRIPE_PRICE_ID_ANNUAL) return 'anual'
  return null
}

export function statusLabelForSubscription(status?: string | null) {
  switch (status) {
    case 'trialing': return 'Em teste'
    case 'active': return 'Ativa'
    case 'past_due': return 'Pagamento pendente'
    case 'canceled': return 'Cancelada'
    case 'incomplete': return 'Pagamento incompleto'
    case 'incomplete_expired': return 'Pagamento expirado'
    case 'unpaid': return 'Não paga'
    case 'paused': return 'Pausada'
    default: return status || 'Não iniciada'
  }
}

export function planLabel(planCode?: string | null) {
  switch (planCode) {
    case 'mensal': return 'Plano Mensal'
    case 'anual': return 'Plano Anual'
    case 'personalizado': return 'Plano Personalizado'
    case 'gestao': return 'Gestão/Teste grátis'
    default: return 'Sem plano'
  }
}
