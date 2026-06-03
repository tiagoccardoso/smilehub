import { AdminUserRow, BookingRow, BookingType, UserType } from './types'

export function mapBooking(row: BookingRow): BookingType {
  return {
    _id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    message: row.message ?? '',
    status: row.status,
    date: row.date,
    time: row.time,
  }
}

export function mapUser(row: AdminUserRow): UserType {
  return {
    _id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    role: row.role,
  }
}
