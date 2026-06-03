import { sql } from '@/lib/neon'

export async function runDbHealthCheck() {
  const startedAt = Date.now()
  const [pingRow] = await sql`SELECT 1 as ok`
  const [nowRow] = await sql`SELECT NOW() as now`

  return {
    ok: Boolean((pingRow as { ok?: number }).ok),
    latencyMs: Date.now() - startedAt,
    now: String((nowRow as { now?: string | Date }).now ?? ''),
  }
}

export function sanitizeDbError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return { name: 'UnknownError', message: 'Erro desconhecido' }
}
