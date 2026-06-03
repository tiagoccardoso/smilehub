import { updateUserPassword } from '@/lib/auth'
import { requireClinicAccess } from '@/lib/clinic'
import { mapUser } from '@/lib/dbMappers'
import { sql } from '@/lib/neon'
import { toSafeAuthError } from '@/lib/authApiErrors'
import type { AdminRole, AdminUserRow } from '@/lib/types'

const allowedRoles: AdminRole[] = ['admin', 'dentist', 'reception', 'financial']

export async function GET() {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const users = await sql`
      select u.id, u.email, u.name, cu.role
        from clinic_users cu
        join "user" u on u.id = cu.user_id
       where cu.clinic_id = ${clinic.id}::uuid
       order by cu.is_owner desc, cu.created_at asc
    `
    return Response.json({ message: 'Usuários encontrados', users: (users as AdminUserRow[]).map(mapUser) })
  } catch (error: any) {
    return Response.json({ message: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { clinic } = await requireClinicAccess(['superadmin', 'admin'])
    const { _id, name, email, password, role: nextRole } = await req.json()
    if (!_id) return Response.json({ message: 'Usuário inválido' }, { status: 400 })
    if (!name || !email) return Response.json({ message: 'Nome e e-mail são obrigatórios.' }, { status: 400 })

    const membership = await sql`select id, is_owner from clinic_users where clinic_id = ${clinic.id}::uuid and user_id = ${_id}::uuid limit 1`
    if (!(membership as unknown[]).length) return Response.json({ message: 'Usuário não encontrado nesta clínica.' }, { status: 404 })

    const safeRole = allowedRoles.includes(nextRole) ? nextRole as AdminRole : null
    await sql`
      update "user"
         set name = ${String(name).trim()}, email = ${String(email).toLowerCase().trim()}, updated_at = now()
       where id = ${_id}::uuid
    `
    if (safeRole) {
      await sql`update clinic_users set role = ${safeRole}::admin_role, updated_at = now() where clinic_id = ${clinic.id}::uuid and user_id = ${_id}::uuid and is_owner = false`
    }
    if (password) await updateUserPassword(_id, password)
    return Response.json({ message: 'Usuário atualizado' })
  } catch (error: any) {
    const safeError = toSafeAuthError(error)
    return Response.json({ message: safeError.message }, { status: safeError.status >= 500 ? 500 : safeError.status })
  }
}

export async function DELETE(req: Request) {
  try {
    const { clinic, admin } = await requireClinicAccess(['superadmin', 'admin'])
    const _id = new URL(req.url).searchParams.get('_id')
    if (!_id) return Response.json({ message: 'Usuário inválido' }, { status: 400 })
    if (_id === admin.profile.id) return Response.json({ message: 'Você não pode remover seu próprio acesso.' }, { status: 400 })

    const deleted = await sql`
      delete from clinic_users
       where clinic_id = ${clinic.id}::uuid
         and user_id = ${_id}::uuid
         and is_owner = false
       returning user_id
    `
    if (!(deleted as unknown[]).length) return Response.json({ message: 'Usuário não encontrado ou proprietário da clínica.' }, { status: 404 })

    await sql`delete from "user" u where u.id = ${_id}::uuid and not exists (select 1 from clinic_users cu where cu.user_id = u.id)`
    return Response.json({ message: 'Usuário removido da clínica' })
  } catch (error: any) {
    return Response.json({ message: error.message }, { status: 500 })
  }
}
