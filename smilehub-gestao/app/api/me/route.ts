import { getCurrentAdminProfile } from '@/lib/auth'
import { getCurrentClinic } from '@/lib/clinic'
import { sql } from '@/lib/neon'

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

    return Response.json({
      message: 'Usuário encontrado',
      id: admin.profile.id,
      user: admin.profile.name,
      email: admin.profile.email,
      role: admin.profile.role,
      phone: enrichedProfile.phone ?? null,
      avatarUrl: enrichedProfile.avatar_url ?? null,
      clinic: clinic ? { id: clinic.id, name: clinic.name, logoUrl: clinic.logo_url } : null,
    })
  } catch (error) {
    console.error('me.get', error)

    return Response.json({ message: 'Não autorizado' }, { status: 401 })
  }
}
