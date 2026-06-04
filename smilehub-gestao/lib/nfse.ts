export type NfseProviderStatus = 'configured' | 'missing_configuration'

export type NfseIssuePayload = {
  idempotencyKey: string
  patientName: string
  patientDocument?: string | null
  patientEmail?: string | null
  serviceName: string
  serviceCode?: string | null
  description: string
  amount: number
}

export type NfseIssueResult = {
  providerStatus: NfseProviderStatus
  status: 'issued' | 'processing' | 'configuration_required' | 'failed'
  externalId?: string | null
  number?: string | null
  verificationCode?: string | null
  pdfUrl?: string | null
  xmlUrl?: string | null
  message: string
  safeResponse?: Record<string, unknown>
}

export function getNfseConfig() {
  return {
    provider: process.env.NFSE_PROVIDER || 'national',
    environment: process.env.NFSE_ENVIRONMENT || 'homologation',
    baseUrl: process.env.NFSE_API_BASE_URL || '',
    apiToken: process.env.NFSE_API_TOKEN || '',
    cityCode: process.env.NFSE_CITY_CODE || '',
    defaultServiceCode: process.env.NFSE_DEFAULT_SERVICE_CODE || '',
  }
}

export function hasNfseProviderConfig() {
  const config = getNfseConfig()
  return Boolean(config.baseUrl && config.apiToken)
}

export async function issueNfse(payload: NfseIssuePayload): Promise<NfseIssueResult> {
  const config = getNfseConfig()
  if (!hasNfseProviderConfig()) {
    return {
      providerStatus: 'missing_configuration',
      status: 'configuration_required',
      message: 'Provedor NFSe não configurado. Defina NFSE_API_BASE_URL, NFSE_API_TOKEN e parâmetros municipais antes da emissão real.',
    }
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/nfse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
        'Idempotency-Key': payload.idempotencyKey,
      },
      body: JSON.stringify({
        environment: config.environment,
        city_code: config.cityCode,
        service_code: payload.serviceCode || config.defaultServiceCode,
        description: payload.description,
        amount: payload.amount,
        customer: {
          name: payload.patientName,
          document: payload.patientDocument,
          email: payload.patientEmail,
        },
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        providerStatus: 'configured',
        status: 'failed',
        message: data?.message || data?.error || 'A API de NFSe recusou a emissão.',
        safeResponse: { status: response.status, message: data?.message || data?.error },
      }
    }

    return {
      providerStatus: 'configured',
      status: data?.status === 'issued' || data?.status === 'approved' || data?.numero ? 'issued' : 'processing',
      externalId: data?.id || data?.uuid || data?.external_id || null,
      number: data?.number || data?.numero || null,
      verificationCode: data?.verification_code || data?.codigo_verificacao || null,
      pdfUrl: data?.pdf_url || data?.danfse_url || null,
      xmlUrl: data?.xml_url || null,
      message: data?.message || data?.motivo || 'Solicitação de NFSe enviada ao provedor.',
      safeResponse: {
        status: data?.status,
        number: data?.number || data?.numero,
        external_id: data?.id || data?.uuid || data?.external_id,
      },
    }
  } catch (error: any) {
    return {
      providerStatus: 'configured',
      status: 'failed',
      message: error?.message || 'Falha de comunicação com o provedor NFSe.',
    }
  }
}
