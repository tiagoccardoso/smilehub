import { getCurrentAdminProfile } from './auth'

export type ClinicRole = 'superadmin' | 'admin' | 'dentist' | 'reception' | 'financial'

export async function getCurrentRole() {
  const profile = await getCurrentAdminProfile()
  return (profile?.role ?? null) as ClinicRole | null
}

export function canAccess(role: ClinicRole | null, allowed: ClinicRole[]) {
  return !!role && allowed.includes(role)
}
