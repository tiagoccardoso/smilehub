import { createUser } from '@/lib/auth'
import { requireClinicAccess } from '@/lib/clinic'
import { sql } from '@/lib/neon'
import { toSafeAuthError } from '@/lib/authApiErrors'
import { validateUserOnlyRegisterInput } from '@/lib/userValidation'
import type { AdminRole } from '@/lib/types'

const allowedRoles: AdminRole[] = ['admin', 'dentist', 'reception', 'financial']

export async function POST(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const payload = await req.json()
    const validated = validateUserOnlyRegisterInput(payload)
    if (!validated.ok) return Response.json({ message: validated.message }, { status: validated.status })

    const requestedRole = allowedRoles.includes(payload.role) ? payload.role as AdminRole : 'admin'
    const user = await createUser(validated.data.email, validated.data.name, validated.data.password, requestedRole)

    await sql`
      insert into clinic_users (clinic_id, user_id, role, is_owner)
      values (${clinic.id}::uuid, ${user.id}::uuid, ${requestedRole}::admin_role, false)
      on conflict (clinic_id, user_id) do update set role = excluded.role, updated_at = now()
    `

    return Response.json({ message: 'Novo usuário criado', name: user?.name, email: user?.email, role: user?.role })
  } catch (error: unknown) {
    const safeError = toSafeAuthError(error)
    const dbError = error as { message?: string; code?: string; detail?: string; constraint?: string } | null
    const hasDbLikeSignal = !!(
      dbError?.message ||
      dbError?.code ||
      dbError?.detail ||
      dbError?.constraint
    )
    if (safeError.status >= 500 || (safeError.status >= 400 && safeError.status < 500 && hasDbLikeSignal)) {
      console.error('[users/register] db error', {
        status: safeError.status,
        message: dbError?.message,
        code: dbError?.code,
        detail: dbError?.detail,
        constraint: dbError?.constraint,
      })
    }
    return Response.json({ message: safeError.message }, { status: safeError.status })
  }
}
