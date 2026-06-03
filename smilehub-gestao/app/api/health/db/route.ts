import { runDbHealthCheck, sanitizeDbError } from '@/lib/dbHealth'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeTokenMatch(receivedToken: string | null, expectedToken: string) {
  if (!receivedToken) return false

  const received = Buffer.from(receivedToken)
  const expected = Buffer.from(expectedToken)

  if (received.length !== expected.length) return false

  return timingSafeEqual(received, expected)
}

function isAuthorized(request: Request) {
  const token = process.env.DB_HEALTHCHECK_TOKEN
  if (!token) {
    return process.env.NODE_ENV !== 'production'
  }

  const headerToken = request.headers.get('x-db-health-token')
  return safeTokenMatch(headerToken, token)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, message: 'Não autorizado' }, { status: 401 })
  }

  try {
    const health = await runDbHealthCheck()

    return Response.json({
      ok: true,
      message: 'Conexão com banco OK',
      dbTime: health.now,
      latencyMs: health.latencyMs,
    })
  } catch (error) {
    const safeError = sanitizeDbError(error)
    console.error('Falha no health check do banco', safeError)

    return Response.json(
      { ok: false, message: 'Falha ao conectar no banco de dados' },
      { status: 500 },
    )
  }
}
