export type BookingStatus = 'pending' | 'completed' | 'canceled'
export type AdminRole = 'admin' | 'superadmin' | 'dentist' | 'reception' | 'financial'

export type BookingType = {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
  status: BookingStatus
  date: string
  time: string
}

export type UserType = {
  _id: string
  name: string
  email?: string
  role: AdminRole
}

export type BookingRow = {
  id: string
  mongo_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  message: string
  status: BookingStatus
  date: string
  time: string
  professional_id?: string | null
  created_at?: string
  updated_at?: string
}

export type AdminUserRow = {
  id: string
  mongo_id?: string | null
  email?: string | null
  name: string
  role: AdminRole
  phone?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}
