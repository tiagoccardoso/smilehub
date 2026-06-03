import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
const missingDatabaseUrl = 'postgresql://missing:missing@localhost/missing'

export const sql = neon(databaseUrl || missingDatabaseUrl)

export function assertDatabaseUrl() {
  if (!databaseUrl) throw new Error('Variável de ambiente DATABASE_URL ausente')
}

export type NeonAuthUserPayload = {
  id: string
  email?: string | null
  name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type NeonAuthWebhookPayload = {
  type?: string
  event?: string
  user?: NeonAuthUserPayload
  data?: {
    user?: NeonAuthUserPayload
  }
}
