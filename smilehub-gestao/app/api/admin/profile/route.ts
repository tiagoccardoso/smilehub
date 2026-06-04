import { getCurrentAdminProfile, setSession } from '@/lib/auth'
import { requireClinicAccess } from '@/lib/clinic'
import { removePublicImage, savePublicImage } from '@/lib/imageUpload'
import { sql } from '@/lib/neon'

const optional = (value: FormDataEntryValue | null) => String(value || '').trim() || null

export async function GET() {
  const { admin } = await requireClinicAccess()
  const rows = await sql`
    select id, name, email, role, phone, avatar_url
      from public."user"
     where id = ${admin.profile.id}::uuid
     limit 1
  `
  const profile = (rows as any[])[0]
  if (!profile) return Response.json({ message: 'Perfil não encontrado' }, { status: 404 })
  return Response.json({ profile })
}

export async function PATCH(req: Request) {
  try {
    const current = await getCurrentAdminProfile()
    if (!current) return Response.json({ message: 'Não autorizado' }, { status: 401 })
    await requireClinicAccess()

    const formData = await req.formData()
    const name = optional(formData.get('name'))
    const phone = optional(formData.get('phone'))
    if (!name) return Response.json({ message: 'Informe o nome do usuário.' }, { status: 400 })

    const currentRows = await sql`select avatar_url from public."user" where id = ${current.profile.id}::uuid limit 1`
    const currentAvatar = (currentRows as any[])[0]?.avatar_url || null
    const uploadedAvatar = await savePublicImage(formData.get('avatar'), 'user-avatar')
    const avatarUrl = uploadedAvatar || currentAvatar

    const rows = await sql`
      update public."user"
         set name = ${name},
             phone = ${phone},
             avatar_url = ${avatarUrl},
             updated_at = now()
       where id = ${current.profile.id}::uuid
       returning id, name, email, role, phone, avatar_url
    `
    const profile = (rows as any[])[0]
    if (!profile) return Response.json({ message: 'Perfil não encontrado' }, { status: 404 })

    if (uploadedAvatar && currentAvatar && currentAvatar !== uploadedAvatar) await removePublicImage(currentAvatar)
    await setSession({ id: profile.id, email: profile.email, name: profile.name, role: profile.role })
    return Response.json({ message: 'Perfil atualizado', profile })
  } catch (error: any) {
    console.error('profile.patch')
    return Response.json({ message: error?.message || 'Não foi possível atualizar o perfil.' }, { status: 400 })
  }
}
