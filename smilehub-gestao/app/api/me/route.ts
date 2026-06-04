import { getCurrentAdminProfile } from '@/lib/auth'
import { getCurrentClinic } from '@/lib/clinic'
import { sql } from '@/lib/neon'
import { getSubscriptionAccess, planLabel, statusLabelForSubscription } from '@/lib/subscription'

export async function GET() {
  try {
    const admin = await getCurrentAdminProfile()

    if (!admin) {
      return Response.json({ message: 'Não autorizado' }, { status: 401 })
    }

    let enrichedProfile: { phone?: string | null; avatar_url?: string | null } = {}
    try {
      const rows = await sql`select phone, avatar_url from public."user" where id = ${admin.profile.id}::uuid limit 1`
      enrichedProfile = (rows as any[])[0] ?? {}
    } catch {
      enrichedProfile = {}
    }

    const clinic = await getCurrentClinic()

    const access = getSubscriptionAccess(clinic ? {
      id: '',
      clinic_id: clinic.id,
      plan_code: clinic.plan_code || 'gestao',
      status: clinic.subscription_status || 'incomplete',
      trial_ends_at: clinic.trial_ends_at,
      current_period_ends_at: clinic.current_period_ends_at,
    } : null)

    return Response.json({
      message: 'Usuário encontrado',
      id: admin.profile.id,
      user: admin.profile.name,
      email: admin.profile.email,
      role: admin.profile.role,
      phone: enrichedProfile.phone ?? null,
      avatarUrl: enrichedProfile.avatar_url ?? null,
      clinic: clinic ? { id: clinic.id, name: clinic.name, logoUrl: clinic.logo_url } : null,
      subscription: clinic ? {
        planCode: clinic.plan_code || null,
        planLabel: planLabel(clinic.plan_code),
        status: clinic.subscription_status || null,
        statusLabel: statusLabelForSubscription(clinic.subscription_status),
        trialEndsAt: clinic.trial_ends_at || null,
        currentPeriodEndsAt: clinic.current_period_ends_at || null,
        hasAccess: access.hasAccess,
        reason: access.reason,
        message: access.message,
        daysLeft: access.daysLeft || null,
      } : { hasAccess: false, reason: 'no_subscription', message: access.message },
    })
  } catch (error) {
    console.error('me.get', error)

    return Response.json({ message: 'Não autorizado' }, { status: 401 })
  }
}
