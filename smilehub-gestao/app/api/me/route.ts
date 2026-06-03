import { getCurrentAdminProfile } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await getCurrentAdminProfile()

    if (!admin) {
      return Response.json({ message: 'Não autorizado' }, { status: 401 })
    }

    return Response.json({
      message: 'Usuário encontrado',
      user: admin.profile.name,
      email: admin.profile.email,
      role: admin.profile.role,
    })
  } catch (error) {
    console.error('me.get', error)

    return Response.json({ message: 'Não autorizado' }, { status: 401 })
  }
}
