import { sql } from '@/lib/neon'
import { AdminRole, AdminUserRow, BookingRow } from '@/lib/types'

type AdminWithPassword = AdminUserRow & { password_hash: string | null }

export async function getAdminByEmail(email: string) {
  const rows = await sql`SELECT id, email, name, role, password_hash FROM "user" WHERE email = ${email} LIMIT 1`
  return (rows as AdminWithPassword[])[0] ?? null
}

export async function createAdminUser(email: string, name: string, role: AdminRole, passwordHash: string) {
  const rows = await sql`INSERT INTO "user" (email, name, role, password_hash) VALUES (${email}, ${name}, ${role}, ${passwordHash}) RETURNING id, email, name, role`
  return (rows as AdminUserRow[])[0]
}

export async function updateAdminUserPassword(id: string, passwordHash: string) {
  await sql`UPDATE "user" SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${id}`
}

export async function listAdminUsers() {
  const rows = await sql`SELECT id, email, name, role FROM "user" ORDER BY created_at ASC`
  return rows as AdminUserRow[]
}

export async function getAdminById(id: string) {
  const rows = await sql`SELECT id, role FROM "user" WHERE id = ${id} LIMIT 1`
  return (rows as AdminUserRow[])[0] ?? null
}

export async function deleteAdminById(id: string) { await sql`DELETE FROM "user" WHERE id = ${id}` }

export async function listBookings() {
  const rows = await sql`SELECT * FROM bookings ORDER BY status DESC, date ASC, time ASC`
  return rows as BookingRow[]
}
