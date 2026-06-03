import { getCurrentAdminProfile } from './auth'

export async function isSuperAdmin() {
  const admin = await getCurrentAdminProfile()
  return admin?.role ?? false
}
