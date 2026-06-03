import { createUserWithClinic, setSession } from '@/lib/auth'
import { toSafeAuthError } from '@/lib/authApiErrors'
import { validateRegisterInput } from '@/lib/userValidation'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const validated = validateRegisterInput(payload)
    if (!validated.ok) {
      return Response.json({ message: validated.message }, { status: validated.status })
    }

    const user = await createUserWithClinic(validated.data)

    await setSession({ id: user.id, email: user.email, name: user.name, role: user.role })
    return Response.json({ authenticated: true, message: 'Cadastro realizado com sucesso' })
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
      console.error('[auth/register] db error', {
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
