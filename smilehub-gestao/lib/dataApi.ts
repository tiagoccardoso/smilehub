type DataApiRequestOptions = {
  method?: string
  searchParams?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: HeadersInit
}

export class DataApiRequestError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'DataApiRequestError'
    this.status = status
    this.details = details
  }
}

function getDatabaseConfig() {
  const dataApiBaseUrl = process.env.NEON_AUTH_BASE_URL

  if (!dataApiBaseUrl) {
    throw new Error('Variável de ambiente NEON_AUTH_BASE_URL ausente para acesso à API de dados')
  }

  let parsed: URL
  try {
    parsed = new URL(dataApiBaseUrl)
  } catch {
    throw new Error('NEON_AUTH_BASE_URL inválida')
  }

  // Mantém compatibilidade com a camada atual baseada em PostgREST.
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEON_AUTH_BASE_URL deve apontar para o endpoint HTTP(S) da API de dados neste projeto')
  }

  const serviceRoleKey = process.env.NEON_AUTH_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Variável de ambiente NEON_AUTH_SERVICE_ROLE_KEY ausente')
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ''),
    serviceRoleKey,
  }
}

export async function dataApiRequest<T>(
  resource: string,
  options: DataApiRequestOptions = {},
) {
  const { baseUrl, serviceRoleKey } = getDatabaseConfig()
  const endpoint = new URL(`${baseUrl}/rest/v1/${resource}`)

  Object.entries(options.searchParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      endpoint.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(endpoint, {
    method: options.method ?? 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const rawBody = await response.text()
  let data: unknown = null

  if (rawBody) {
    try {
      data = JSON.parse(rawBody)
    } catch {
      data = { rawBody }
    }
  }

  if (!response.ok) {
    const message =
      typeof (data as { message?: unknown } | null)?.message === 'string'
        ? String((data as { message: string }).message)
        : `Requisição à API de dados falhou com status ${response.status}`

    throw new DataApiRequestError(message, response.status, data)
  }

  const contentRange = response.headers.get('content-range')
  const count = contentRange ? Number(contentRange.split('/')[1]) : undefined

  return { data: data as T, count, response }
}
