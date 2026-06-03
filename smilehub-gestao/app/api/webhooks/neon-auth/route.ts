import { createHmac, timingSafeEqual } from 'node:crypto'

import { sql, type NeonAuthUserPayload, type NeonAuthWebhookPayload } from '@/lib/neon'

export const runtime = 'nodejs'

function getUserFromPayload(payload: NeonAuthWebhookPayload): NeonAuthUserPayload | null {
  return payload.user ?? payload.data?.user ?? null
}

function verifySignature(rawBody: string, receivedSignature: string | null) {
  const secret = process.env.NEON_AUTH_SECRET

  if (!secret) {
    throw new Error('Variável de ambiente NEON_AUTH_SECRET ausente')
  }

  if (!receivedSignature) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const normalized = receivedSignature.replace(/^sha256=/, '')

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(normalized)

  if (expectedBuffer.length !== receivedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature =
    request.headers.get('x-neon-signature') ??
    request.headers.get('neon-signature') ??
    request.headers.get('x-webhook-signature')

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: 'Assinatura do webhook inválida' }, { status: 401 })
  }

  let payload: NeonAuthWebhookPayload

  try {
    payload = JSON.parse(rawBody) as NeonAuthWebhookPayload
  } catch {
    return Response.json({ error: 'Payload JSON inválido' }, { status: 400 })
  }

  const event = payload.type ?? payload.event
  const user = getUserFromPayload(payload)

  if (!event || !user?.id) {
    return Response.json({ error: 'Evento sem campos obrigatórios (event/type e user.id)' }, { status: 400 })
  }

  if (!['user.created', 'auth.user.created', 'user.updated', 'auth.user.updated'].includes(event)) {
    return Response.json({ ok: true, skipped: true, reason: `Evento não tratado: ${event}` })
  }

  await sql`
    INSERT INTO users (id, email, name)
    VALUES (${user.id}, ${user.email ?? null}, ${user.name ?? null})
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW();
  `

  return Response.json({ ok: true, event, userId: user.id })
}
